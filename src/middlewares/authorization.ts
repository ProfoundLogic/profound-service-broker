import crypto, { JsonWebKey } from 'node:crypto'
import { RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import axios from 'axios'

import logger from '../utils/logger'
import { IAuthenticator } from '../utils/authenticatorUtil'

const KEYS_ENDPOINT = `${process.env.IAM_ENDPOINT as string}/identity/keys`

interface identityKeysResponse {
  keys: JsonWebKey[]
}

interface AuthenticatorParams {
  allowlistedIds: string[]
}
export class Authenticator implements IAuthenticator {
  private publicKeys: JsonWebKey[] = []
  private allowlistedIds: Set<string>
  private intervalHandle: NodeJS.Timeout | undefined

  public static async build(params: AuthenticatorParams) {
    const instance = new Authenticator(params)
    await instance.init()
    return instance
  }

  constructor({ allowlistedIds }: AuthenticatorParams) {
    this.allowlistedIds = new Set(
      allowlistedIds.map(id => {
        return `crn-${id}`
      }),
    )
  }

  private async fetchIdentityKeys(): Promise<JsonWebKey[]> {
    try {
      const resp = await axios.get<identityKeysResponse>(KEYS_ENDPOINT)
      return resp.data.keys
    } catch (e) {
      logger.error(`Error fetching IAM Identity keys ${e}`)
      throw e
    }
  }

  public async init(): Promise<void> {
    this.publicKeys = await this.fetchIdentityKeys()
    const to = setInterval(
      async arg => {
        arg.publicKeys = await arg.fetchIdentityKeys()
      },
      20 * 60 * 1000,
      this,
    )
    to.unref()
    this.intervalHandle = to
  }

  private verifyJWT(credential: string): string | jwt.JwtPayload {
    const decodedToken = jwt.decode(credential, { complete: true })
    if (!decodedToken) {
      throw new Error('token could not be decoded')
    }
    const { kid, alg } = decodedToken.header
    const matchingKey = this.publicKeys.find(
      key => key.kid === kid && key.alg === alg,
    )

    if (!matchingKey) {
      logger.error('could not find matching key for token validation')
      throw new Error('invalid token')
    }
    try {
      return jwt.verify(
        credential,
        crypto.createPublicKey({
          key: matchingKey,
          format: 'jwk',
        }),
      )
    } catch (e) {
      logger.error(e)
      throw new Error('invalid token')
    }
  }

  private authorizeBearerCredential(credential: string): boolean {
    let token
    try {
      token = this.verifyJWT(credential)
    } catch (e) {
      logger.error('invalid token')
      return false
    }
    if (typeof token !== 'object') {
      logger.error('invalid token type')
      return false
    }
    const { id } = token
    if (!this.allowlistedIds.has(id)) {
      logger.error('identity not allowed')
      return false
    }
    return true
  }

  public authorizeRequest: RequestHandler = (req, res, next) => {
    const authHeader = req.headers['authorization']

    if (!authHeader) {
      logger.warn('Authorization header is missing')
      return res.sendStatus(401)
    }

    const [authType, credentials] = authHeader.split(' ')

    if (!authType) {
      return res.sendStatus(401)
    }

    if (!credentials) {
      return res.sendStatus(401)
    }

    // More authentication types can be supported here
    // Removed support for Basic and Bearer authTypes as they are deprecated
    switch (authType.toLowerCase()) {
      case 'bearer':
        if (!this.authorizeBearerCredential(credentials)) {
          return res.sendStatus(403)
        }
        break
      default:
        return res.sendStatus(401)
    }
    next()
  }
}
