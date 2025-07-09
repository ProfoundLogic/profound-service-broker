import { CronJob } from 'cron'
import AppDataSource from '../../db/data-source'
import { ServiceInstance } from '../../db/entities/service-instance.entity'
import { BillingService } from '../billing.service'
import { UsageService } from '../usage.service'

export class BillingServiceImpl implements BillingService {
  private job: CronJob

  constructor(private usageService: UsageService) {
    this.job = CronJob.from({
      cronTime: '0 0 2 * *',
      onTick: this.sendBillingData,
      start: false,
    })
  }

  async sendBillingData(): Promise<void> {
    const serviceInstanceRepository =
      AppDataSource.getRepository(ServiceInstance)
    const serviceInstances = await serviceInstanceRepository.find()
    for (const serviceInstance of serviceInstances) {
      await this.usageService.sendUsageData(serviceInstance.instanceId, {
        planId: serviceInstance.planId,
        resourceInstanceId: serviceInstance.instanceId,
        start: 0,
        end: 0,
        region: '',
        measuredUsage: [],
      })
    }
  }

  startJob(): void {
    this.job.start()
  }

  stopJob(): void {
    this.job.stop()
  }
}
