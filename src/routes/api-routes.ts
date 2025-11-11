import express, { Request, Response, NextFunction, Router } from 'express'
import { BrokerRoutes } from './broker.routes'
import { SupportInfoRoutes } from './support-info.routes'
import { Authenticator } from '../middlewares/authorization'
import { AdminAuthenticator } from '../middlewares/admin-authorization'
import { IAuthenticator } from '../utils/authenticatorUtil'

export class ApiRoutes {
  static async routes(): Promise<Router> {
    const router = Router()

    router.use(express.json())

    let authenticator: IAuthenticator
    if (process.env.NODE_ENV === 'production') {
      authenticator = await Authenticator.build({
        allowlistedIds: (process.env.BROKER_BEARER_IDENTITIES as string)?.split(
          ',',
        ),
      })
    } else {
      authenticator = await AdminAuthenticator.build()
    }

    router.use(authenticator.authorizeRequest)

    router.use('/', BrokerRoutes.routes())
    router.use('/', SupportInfoRoutes.routes())

    router.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Content-Type', 'application/json')
      next()
    })

    return router
  }
}
