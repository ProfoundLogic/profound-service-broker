export interface BillingService {
  sendBillingData(): Promise<void>
  startJob(): void
  stopJob(): void
}
