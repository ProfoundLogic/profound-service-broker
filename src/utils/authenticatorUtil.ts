import { RequestHandler } from 'express'

export interface IAuthenticator {
  authorizeRequest: RequestHandler
}
