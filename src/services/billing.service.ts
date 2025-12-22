import { BillingFailure } from '../db/entities/billing-failure.entity'
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
  adminRetryBilling(): Promise<BillingFailure[]>
  startJob(): void
  stopJob(): void
}
