import { readFile } from 'node:fs/promises'
import { DashboardService } from '../dashboard.service'
import path from 'node:path'
import logger from '../../utils/logger'

export class DashboardServiceImpl implements DashboardService {
  public async buildDashboard(
    instanceId: string,
    authorizationCode: string,
  ): Promise<string> {
    const filePath = path.join(
      __dirname,
      '..',
      '..',
      'assets',
      'dashboard.html',
    )
    try {
      const dashboardContent = (await readFile(filePath)).toString()
      return dashboardContent.replace(
        '{{authorizationCode}}',
        authorizationCode,
      )
    } catch (error) {
      logger.error('Error building dashboard:', error)
      throw new Error('Error building dashboard')
    }
  }
}
