import { ServiceInstance } from '../db/entities/service-instance.entity'

export interface BillingRequestParams {
  manualRequest: boolean
  test: boolean
}

export interface BillingService {
  sendBillingForInstance(
    serviceInstance: ServiceInstance,
    params: BillingRequestParams,
  ): Promise<void>
  startJob(): void
  stopJob(): void
}
