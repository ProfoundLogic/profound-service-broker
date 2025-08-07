export interface DashboardService {
  buildDashboard(instanceId: string): Promise<string>
}
