import { Request, Response, NextFunction, Router } from 'express'
import { DashboardServiceImpl } from '../services/impl/dashboard-impl.service'
import { DashboardController } from '../controllers/dashboard.controller'

export class DashboardRoutes {
  static routes(): Router {
    const router = Router()

    const service = new DashboardServiceImpl()
    const controller = new DashboardController(service)

    router.get('/', controller.sendDashboard)

    router.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Content-Type', 'application/html')
      next()
    })

    return router
  }
}
