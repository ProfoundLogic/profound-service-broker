import { Router } from 'express'
import { UsageController } from '../controllers/usage.controller'
import { UsageServiceImpl } from '../services/impl/usage-impl.service'
import { IAMServiceImpl } from '../services/impl/iam-impl.service'

// TODO: REMOVE THIS ONCE DEVELOPMENT IS DONE
export class UsageRoutes {
  static get routes(): Router {
    const router = Router()

    const service = new UsageServiceImpl(new IAMServiceImpl())
    const controller = new UsageController(service)

    router.post('/metering/:resourceId/usage', controller.sendUsageData)

    return router
  }
}
