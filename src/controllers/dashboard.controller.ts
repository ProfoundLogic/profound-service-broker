import { RequestHandler } from 'express'
import logger from '../utils/logger'
import { DashboardService } from '../services/dashboard.service'

export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  public sendDashboard: RequestHandler = async (
    req,
    res,
    next,
  ): Promise<void> => {
    try {
      const instanceId = parseInt(req.query.id as string, 10)

      logger.info(`Request received: GET /dashboard`)

      const response = await this.dashboardService.buildDashboard(instanceId)
      res.status(200).send(response)
    } catch (error) {
      logger.error(`Error sending dashboard: ${error}`)
      next(error)
    }
  }
}
