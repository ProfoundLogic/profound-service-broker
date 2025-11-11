import express, { Request, Response, NextFunction, Router } from 'express'
import { AdminAuthenticator } from '../middlewares/admin-authorization'
import { AdminController } from '../controllers/admin.controller'
import { AdminServiceImpl } from '../services/impl/admin-impl.service'
import { BillingServiceImpl } from '../services/impl/billing-impl.service'
import { IAMServiceImpl } from '../services/impl/iam-impl.service'

export class AdminRoutes {
  static async routes(): Promise<Router> {
    const router = Router()

    router.use(express.json())

    const authenticator = await AdminAuthenticator.build()

    router.use(authenticator.authorizeRequest)

    const service = new AdminServiceImpl(
      new BillingServiceImpl(new IAMServiceImpl()),
    )
    const controller = new AdminController(service)

    router.post('/email-test', controller.sendTestEmail)
    router.post('/migrate', controller.runMigrations)
    router.post('/retry-billing', controller.retryBilling)
    router.post('/submit-billing', controller.submitBilling)

    router.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Content-Type', 'application/json')
      next()
    })

    return router
  }
}
