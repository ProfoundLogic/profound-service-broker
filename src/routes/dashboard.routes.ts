import { Router } from 'express'
import { DashboardServiceImpl } from '../services/impl/dashboard-impl.service'
import { DashboardController } from '../controllers/dashboard.controller'

export class DashboardRoutes {
  static get routes(): Router {
    const router = Router()

    const service = new DashboardServiceImpl()
    const controller = new DashboardController(service)

    router.get('/dashboard', controller.sendDashboard)

    return router
  }
}
