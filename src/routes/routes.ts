import { Router } from 'express'
import { BrokerRoutes } from './broker.routes'
import { SupportInfoRoutes } from './support-info.routes'
import { DashboardRoutes } from './dashboard.routes'

export class AppRoutes {
  static get routes(): Router {
    const router = Router()

    router.use('/', BrokerRoutes.routes)
    router.use('/', SupportInfoRoutes.routes)
    router.use('/', DashboardRoutes.routes)

    return router
  }
}
