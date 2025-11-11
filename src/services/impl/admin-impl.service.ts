import AppDataSource from '../../db/data-source'
import { ServiceInstance } from '../../db/entities/service-instance.entity'
import NotFoundError from '../../errors/not-found-error'
import { AdminService } from '../admin.service'
import { BillingService, BillingRequestParams } from '../billing.service'

export class AdminServiceImpl implements AdminService {
  constructor(private billingService: BillingService) {}

  sendTestEmail(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  runMigrations(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  retryBilling(): Promise<void> {
    throw new Error('Method not implemented.')
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
