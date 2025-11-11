import { RequestHandler } from 'express'
import logger from '../utils/logger'
import { validate } from '../utils/apiKeyUtil'
import { IAuthenticator } from '../utils/authenticatorUtil'

export class AdminAuthenticator implements IAuthenticator {
  public static async build() {
    return new AdminAuthenticator()
  }

  public authorizeRequest: RequestHandler = async (req, res, next) => {
    const apiKey = req.headers['x-broker-api-key'] as string
    if (!apiKey) {
      logger.warn('Admin API Key is missing')
      return res.sendStatus(401)
    }

    if (!(await validate(apiKey))) {
      return res.send(404).end()
    }

    next()
  }
}
