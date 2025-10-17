import { Router } from 'express'
import { DashboardRoutes } from './dashboard.routes'
import { ApiRoutes } from './api-routes'

export class AppRoutes {
  static async routes(): Promise<Router> {
    const router = Router()

    router.use('/dashboard', DashboardRoutes.routes())
    router.use('/', await ApiRoutes.routes())

    return router
  }
}
