import { RequestHandler } from 'express'
import logger from '../utils/logger'
import { AdminService } from '../services/admin.service'

export class AdminController {
  constructor(private adminService: AdminService) {}

  public sendTestNotification: RequestHandler = async (
    req,
    res,
    next,
  ): Promise<void> => {
    try {
      await this.adminService.sendTestNotification()
      res.status(200).send({ success: true })
    } catch (error) {
      logger.error(`Error sending email: ${error}`)
      next(error)
    }
  }

  public runMigrations: RequestHandler = async (
    req,
    res,
    next,
  ): Promise<void> => {
    try {
      await this.adminService.runMigrations()
      res.status(200).send({ success: true })
    } catch (error) {
      logger.error(`Error sending email: ${error}`)
      next(error)
    }
  }

  public retryBilling: RequestHandler = async (
    req,
    res,
    next,
  ): Promise<void> => {
    try {
      const failures = await this.adminService.retryBilling()
      if (failures.length === 0) {
        res.status(200).send({ success: true })
      } else {
        res.status(500).send({
          success: false,
          failures: failures.map(failure => JSON.stringify(failure)),
        })
      }
    } catch (error) {
      logger.error(`Error attempting billing: ${error}`)
      next(error)
    }
  }

  public submitBilling: RequestHandler = async (
    req,
    res,
    next,
  ): Promise<void> => {
    try {
      const test = (req.query.test as string) === '0' ? false : true
      logger.info(`test=${test}`)
      logger.info(`raw-test=${req.query.test as string}`)
      const instanceId = req.params.instanceId as string

      await this.adminService.submitBilling(instanceId, test)
      res.status(200).send({ success: true })
    } catch (error) {
      logger.error(`Error testing billing: ${error}`)
      next(error)
    }
  }
}
