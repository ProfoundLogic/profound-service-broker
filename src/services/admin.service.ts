export interface AdminService {
  sendTestNotification(): Promise<void>
  runMigrations(): Promise<void>
  retryBilling(): Promise<void>
  submitBilling(instanceId: string, test: boolean): Promise<void>
}
