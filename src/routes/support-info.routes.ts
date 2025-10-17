import { Router } from 'express'
import { SupportInfoController } from '../controllers/support-info.controller'
import { SupportInfoServiceImpl } from '../services/impl/support-info-impl.service'

export class SupportInfoRoutes {
  static routes(): Router {
    const router = Router()

    const service = new SupportInfoServiceImpl()
    const controller = new SupportInfoController(service)

    router.get('/support/instances', controller.getInstances)
    router.get('/support/metadata', controller.getMetadata)

    return router
  }
}
