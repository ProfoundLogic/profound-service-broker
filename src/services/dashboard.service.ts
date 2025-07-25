export interface DashboardService {
  buildDashboard(instanceId: string, authorizationCode: string): Promise<string>
}
