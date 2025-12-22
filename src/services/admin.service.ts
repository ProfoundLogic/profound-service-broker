import { BillingFailure } from '../db/entities/billing-failure.entity'

export interface AdminService {
  sendTestNotification(): Promise<void>
  runMigrations(): Promise<void>
  retryBilling(): Promise<BillingFailure[]>
  submitBilling(instanceId: string, test: boolean): Promise<void>
}
