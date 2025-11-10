import { CronJob } from 'cron'
import AppDataSource from '../../db/data-source'
import { ServiceInstance } from '../../db/entities/service-instance.entity'
import { BillingRequestParams, BillingService } from '../billing.service'
import { MeteringPayload } from '../../models/metering-payload.model'
import axios, { AxiosError, AxiosResponse } from 'axios'
import logger from '../../utils/logger'
import { IAMService } from '../iam.service'
import { BillingFailure } from '../../db/entities/billing-failure.entity'
import { FindManyOptions, FindOptionsOrder, Repository } from 'typeorm'
import { getBillingFailureEmailContent, sendEmail } from '../../utils/emailUtil'
import { instanceToPlain } from 'class-transformer'

export class BillingServiceImpl implements BillingService {
  private job: CronJob
  private usageEndpoint: string = process.env.USAGE_ENDPOINT || ''
  private resourceID: string = process.env.GLOBAL_CATALOG_SERVICE_ID || ''

  private static readonly USAGE_API_PATH =
    '/v4/metering/resources/{resource_id}/usage'
  private static readonly SUCCESS_REGEX = /^2[0-9]{2}$/
  private static readonly DUPLICATE_RECORD_STATUS = 409

  constructor(private IAMService: IAMService) {
    this.job = CronJob.from({
      cronTime: '0 0 1 * *',
      onTick: this.billingJob,
      start: false,
    })
  }

  public startJob(): void {
    this.job.start()
  }

  public stopJob(): void {
    this.job.stop()
  }

  public async sendBillingForInstance(
    serviceInstance: ServiceInstance,
    params: BillingRequestParams,
  ): Promise<void> {
    const payload = this.createMeteringPayload(serviceInstance, params)
    const iamAccessToken = await this.IAMService.getAccessToken()
    const failures = await this.sendUsageDataToApi(iamAccessToken, [payload])
    if (failures.length > 0) {
      throw new Error(
        `Billing for instance: ${serviceInstance.serviceId} failed.`,
      )
    }
  }

  private createMeteringPayload(
    serviceInstance: ServiceInstance,
    params: BillingRequestParams,
  ): MeteringPayload {
    const monthStart = BillingServiceImpl.getMonthStart(
      serviceInstance.createDate,
      params,
    )
    const quantity = params.test ? 0 : 1
    const payload = new MeteringPayload(
      serviceInstance.planId,
      serviceInstance.instanceId,
      monthStart.getTime(),
      monthStart.getTime(),
      serviceInstance.region,
      [
        {
          measure: 'INSTANCE',
          quantity,
        },
      ],
    )
    return payload
  }

  static getMonthStart(createDate: Date, params: BillingRequestParams): Date {
    let monthStart = new Date()

    // Set month start to the first day of the month
    monthStart.setDate(1)

    // If billing is requested from the monthly CRON job,
    // then set the start month to the previous month
    if (!params.manualRequest) {
      monthStart.setMonth(monthStart.getMonth() - 1)
    }

    // If the requested billing start date is older than the creation date of the instance,
    // then use the creation date with a couple hours of buffer
    if (monthStart < createDate) {
      monthStart = createDate
      monthStart.setHours(monthStart.getHours() + 2)
    }
    return monthStart
  }

  private async billingJob(): Promise<void> {
    const billingFailureRepository = AppDataSource.getRepository(BillingFailure)
    try {
      await this.fillFailureDB(billingFailureRepository)
      const success = await this.retryThreeTimes(async () => {
        const iamAccessToken = await this.IAMService.getAccessToken()
        const failures = await this.attemptBilling(
          iamAccessToken,
          billingFailureRepository,
        )
        if (failures.length === 0) {
          await billingFailureRepository.clear()
          return true
        }
        await this.fillFailureDB(billingFailureRepository, failures)
        return false
      })
      if (success) {
        return
      }
    } catch (error) {
      try {
        await this.sendEmail(billingFailureRepository)
        // eslint-disable-next-line no-empty
      } catch (_) {}
    }
  }

  private async retryThreeTimes(func: Function) {
    for (let i = 0; i < 3; i += 1) {
      const done = await func()
      if (done) return true
      await this.delay(60_000)
    }
    return false
  }

  private async sendEmail(
    billingFailureRepository: Repository<BillingFailure>,
  ) {
    const options = await getBillingFailureEmailContent(
      await billingFailureRepository.find(),
    )
    await sendEmail(options)
  }

  private async fillFailureDB(
    billingFailureRepository: Repository<BillingFailure>,
    failures?: BillingFailure[],
  ) {
    if (failures === undefined) {
      const serviceInstanceRepository =
        AppDataSource.getRepository(ServiceInstance)
      const instances = await serviceInstanceRepository.find()
      failures = instances.map(instance => {
        const payload = this.createMeteringPayload(instance, {
          manualRequest: false,
          test: false,
        })
        return this.getBillingFailureEntity(payload, 'Initial billing failure')
      })
    }
    await billingFailureRepository.clear()
    for (const failure of failures) {
      await billingFailureRepository.insert(failure)
    }
  }

  private async attemptBilling(
    iamAccessToken: string,
    billingFailureRepository: Repository<BillingFailure>,
  ): Promise<BillingFailure[]> {
    let failures: BillingFailure[] = []
    for await (const chunk of this.chunkRepository(billingFailureRepository)) {
      const payloads = chunk.map(billingFailure => {
        return JSON.parse(billingFailure.payload) as MeteringPayload
      })
      failures = failures.concat(
        await this.sendUsageDataToApi(iamAccessToken, payloads),
      )
    }
    return failures
  }

  private async *chunkRepository(
    repository: Repository<BillingFailure>,
  ): AsyncGenerator<BillingFailure[]> {
    const limit = 100
    let skip = 0
    while (true) {
      const findOptions: FindManyOptions<BillingFailure> = {
        skip,
        take: limit,
        order: {
          id: 'ASC',
        } as FindOptionsOrder<BillingFailure>,
      }
      const items = await repository.find(findOptions)
      yield items
      if (items.length === 0 || items.length < limit) {
        return
      }
      skip += items.length
    }
  }

  private async sendUsageDataToApi(
    token: string,
    payloads: MeteringPayload[],
  ): Promise<BillingFailure[]> {
    const url = this.usageEndpoint.concat(
      BillingServiceImpl.USAGE_API_PATH.replace(
        '{resource_id}',
        this.resourceID,
      ),
    )
    const body = payloads.map(payload => {
      return instanceToPlain(payload)
    })
    try {
      const response = await axios.post(url, body, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
      })
      if (response.status === 202) {
        return this.getFailuresFromResponse(payloads, response)
      } else if (response.status === 201) {
        return []
      } else {
        return payloads.map(payload => {
          return this.getBillingFailureEntity(
            payload,
            `Billing request failed with status: ${response.status}`,
          )
        })
      }
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response) {
        logger.error('Failed with status:', axiosError.response.status)
        logger.error('Failed with response:', axiosError.response.data)
      } else {
        logger.error('Failed with unknown error')
      }
    }
    return payloads.map(payload => {
      return this.getBillingFailureEntity(
        payload,
        `Billing request failed unexpectedly. Check logs for information.`,
      )
    })
  }

  private getFailuresFromResponse(
    data: MeteringPayload[],
    response: AxiosResponse,
  ): BillingFailure[] {
    const resources: any[] = response.data.resources
    return resources
      .map((resource, index) => {
        return { resource, payload: data[index] }
      })
      .filter(zip => {
        return !BillingServiceImpl.SUCCESS_REGEX.test(
          zip.resource.status.toString(),
        )
      })
      .filter(zip => {
        return (
          zip.resource.status === BillingServiceImpl.DUPLICATE_RECORD_STATUS
        )
      })
      .map(zip => {
        return this.getBillingFailureEntity(zip.payload, zip.resource.message)
      })
  }

  private getBillingFailureEntity(
    payload: MeteringPayload,
    message: string,
  ): BillingFailure {
    const failure = new BillingFailure()
    failure.payload = JSON.stringify(payload)
    failure.message = message
    failure.createDate = new Date()
    failure.updateDate = new Date()
    return failure
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds)
    })
  }
}
