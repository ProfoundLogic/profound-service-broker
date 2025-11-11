import { Router } from 'express'
import { DashboardRoutes } from './dashboard.routes'
import { ApiRoutes } from './api-routes'
import { AdminRoutes } from './admin-routes'

export class AppRoutes {
  static async routes(): Promise<Router> {
    const router = Router()

    router.use('/dashboard', DashboardRoutes.routes())
    router.use('/admin', await AdminRoutes.routes())
    router.use('/', await ApiRoutes.routes())

    return router
  }
}
