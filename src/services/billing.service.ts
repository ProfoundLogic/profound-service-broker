import { ServiceInstance } from '../db/entities/service-instance.entity'

export interface BillingService {
  sendBillingData(): Promise<void>
  sendBillingForInstance(serviceInstance: ServiceInstance): Promise<void>
  startJob(): void
  stopJob(): void
}
