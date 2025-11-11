export interface AdminService {
  sendTestEmail(): Promise<void>
  runMigrations(): Promise<void>
  retryBilling(): Promise<void>
  submitBilling(instanceId: string, test: boolean): Promise<void>
}
