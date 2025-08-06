import { ServiceInstance } from '../db/entities/service-instance.entity'

export interface BillingService {
  sendBillingForInstance(serviceInstance: ServiceInstance): Promise<void>
  startJob(): void
  stopJob(): void
}
