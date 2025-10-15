import { readFile } from 'node:fs/promises'
import { DashboardService } from '../dashboard.service'
import path from 'node:path'
import logger from '../../utils/logger'
import AppDataSource from '../../db/data-source'
import { ServiceInstance } from '../../db/entities/service-instance.entity'

export class DashboardServiceImpl implements DashboardService {
  private assetPath = path.join(__dirname, '..', '..', 'assets', 'html')

  public async buildDashboard(instanceId: number): Promise<string> {
    const dashboardPath = path.join(this.assetPath, 'dashboard.html')
    try {
      const { pjsAuthorizationCode, puiAuthorizationCode } =
        await this.getAuthorizationCodes(instanceId)
      let dashboardContent = (await readFile(dashboardPath)).toString()
      dashboardContent = dashboardContent.replace(
        '{{pjsAuthorizationCode}}',
        await this.buildAuthorizationCode('PJS', pjsAuthorizationCode),
      )
      return dashboardContent.replace(
        '{{puiAuthorizationCode}}',
        await this.buildAuthorizationCode('PUI', puiAuthorizationCode),
      )
    } catch (error) {
      logger.error('Error building dashboard:', error)
      throw new Error('Error building dashboard')
    }
  }

  private async getAuthorizationCodes(instanceId: number) {
    const serviceInstanceRepository =
      AppDataSource.getRepository(ServiceInstance)
    const serviceInstance = await serviceInstanceRepository.findOneBy({
      id: instanceId,
    })
    if (serviceInstance === null) {
      throw new Error(`Instance ${instanceId} not found`)
    }
    const pjsAuthorizationCode = serviceInstance.pjsAuthorizationCode
    const puiAuthorizationCode = serviceInstance.puiAuthorizationCode
    return {
      pjsAuthorizationCode,
      puiAuthorizationCode,
    }
  }

  private async buildAuthorizationCode(
    product: string,
    authorizationCode?: string,
  ): Promise<string> {
    if (authorizationCode === undefined) {
      return ''
    }
    const templatePath = path.join(this.assetPath, 'authorizationCode.html')
    let template = (await readFile(templatePath)).toString()
    template = template.replaceAll('{{product}}', product)
    return template.replaceAll('{{authorizationCode}}', authorizationCode)
  }
}
