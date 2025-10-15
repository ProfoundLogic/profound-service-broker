export interface DashboardService {
  buildDashboard(instanceId: number): Promise<string>
}
