import AppDataSource from '../../db/data-source'
import { BillingFailure } from '../../db/entities/billing-failure.entity'
import { ServiceInstance } from '../../db/entities/service-instance.entity'
import NotFoundError from '../../errors/not-found-error'
import {
  getBillingFailureNotificationBody,
  notify,
} from '../../utils/notificationUtil'
import { AdminService } from '../admin.service'
import { BillingService, BillingRequestParams } from '../billing.service'

export class AdminServiceImpl implements AdminService {
  constructor(private billingService: BillingService) {}

  async sendTestNotification(): Promise<void> {
    const failure1 = new BillingFailure()
    failure1.id = 1
    failure1.message = 'Billing for instance 1 failed'
    failure1.payload = '{}'
    const failure2 = new BillingFailure()
    failure2.id = 2
    failure2.message = 'Billing for instance 2 failed'
    failure2.payload = '{}'
    const emailOptions = await getBillingFailureNotificationBody([
      failure1,
      failure2,
    ])
    await notify(emailOptions)
  }
  async runMigrations(): Promise<void> {
    await AppDataSource.runMigrations()
  }
  async retryBilling(): Promise<BillingFailure[]> {
    return await this.billingService.adminRetryBilling()
  }
  async submitBilling(instanceId: string, test: boolean): Promise<void> {
    const params: BillingRequestParams = { manualRequest: true, test }
    const serviceInstanceRepository =
      AppDataSource.getRepository(ServiceInstance)
    const instance = await serviceInstanceRepository.findOne({
      where: { instanceId },
    })
    if (instance === null) {
      throw new NotFoundError(`Instance ${instanceId} missing`)
    }
    await this.billingService.sendBillingForInstance(instance, params)
  }
}
