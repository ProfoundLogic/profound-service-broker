import { plainToInstance } from 'class-transformer'

import { BrokerService } from '../broker.service'
import { Catalog } from '../../models/catalog.model'
import { CreateServiceInstanceResponse } from '../../models/response/create-service-instance-response.model'
import { CreateServiceInstanceRequest } from '../../models/create-service-instance-request.model'

import { UpdateStateRequest } from '../../models/update-state-request.model'
import { ServiceInstanceStateResponse } from '../../models/response/service-instance-state-response.model'
import logger from '../../utils/logger'
import { ServiceInstance } from '../../db/entities/service-instance.entity'
import BrokerUtil from '../../utils/brokerUtil'
import { CatalogUtil } from '../../utils/catalogUtil'
import { ServiceInstanceStatus } from '../../enums/service-instance-status'
import { OperationState } from '../../enums/operation-state'
import AppDataSource from '../../db/data-source'
import { FloatingLicenses } from '../../models/floating-licenses.model'
import { CatalogService } from '../catalog.service'
import { LicenseService } from '../license.service'
import { BillingService } from '../billing.service'

export class BrokerServiceImpl implements BrokerService {
  dashboardUrl: string = process.env.BROKER_URL || 'http://localhost:8080'

  lastOperationStatus: { [instanceId: string]: OperationState } = {}

  private static readonly DASHBOARD_ROUTE = '/dashboard'
  private static readonly INSTANCE_STATE = 'state'

  constructor(
    private catalogService: CatalogService,
    private licenseService: LicenseService,
    private billingService: BillingService,
  ) {}

  public async getCatalog(): Promise<Catalog> {
    return this.catalogService.getCatalog()
  }

  public async provision(
    instanceId: string,
    details: any,
    iamId: string,
    region: string,
  ): Promise<CreateServiceInstanceResponse> {
    try {
      const createServiceRequest = new CreateServiceInstanceRequest(details)
      createServiceRequest.instanceId = instanceId

      if (this.requestNotSentFromIBM(createServiceRequest)) {
        logger.error(
          `Unidentified platform: ${createServiceRequest.context?.platform}`,
        )
        throw new Error(
          `Invalid platform: ${createServiceRequest.context?.platform}`,
        )
      }

      const plan = CatalogUtil.getPlan(
        await this.catalogService.getCatalog(),
        createServiceRequest.service_id,
        createServiceRequest.plan_id,
      )

      if (!plan) {
        logger.error(
          `Plan id:${createServiceRequest.plan_id} does not belong to this service: ${createServiceRequest.service_id}`,
        )
        throw new Error(`Invalid plan id: ${createServiceRequest.plan_id}`)
      }

      const floatingLicenses =
        await this.licenseService.provisionFloatingLicenses(instanceId)

      const serviceInstance = this.getServiceInstanceEntity(
        createServiceRequest,
        floatingLicenses,
        iamId,
        region,
      )

      const serviceInstanceRepository =
        AppDataSource.getRepository(ServiceInstance)
      await serviceInstanceRepository.save(serviceInstance)

      logger.info(
        `Service Instance created: instanceId: ${instanceId} status: ${serviceInstance.status} planId: ${plan.id}`,
      )

      const responseUrl = `${this.dashboardUrl}${BrokerServiceImpl.DASHBOARD_ROUTE}?instance_id=${instanceId}`

      const response = plainToInstance(CreateServiceInstanceResponse, {
        dashboard_url: responseUrl,
      })
      return response
    } catch (error) {
      logger.error('Error provisioning service instance:', error)
      throw new Error('Error provisioning service instance')
    }
  }

  public async deprovision(instanceId: string): Promise<boolean> {
    try {
      const serviceInstanceRepository =
        AppDataSource.getRepository(ServiceInstance)
      const serviceInstance = await serviceInstanceRepository.findOneBy({
        instanceId,
      })
      if (serviceInstance === null) {
        throw new Error(`Cannot find service instance: ${instanceId}`)
      }
      await this.billingService.sendBillingForInstance(serviceInstance)
      await this.licenseService.deprovisionFloatingLicenses(serviceInstance)
      await serviceInstanceRepository.delete({ instanceId })
      delete this.lastOperationStatus[instanceId]
      return true
    } catch (error) {
      logger.error('Error deprovisioning service instance:', error)
      this.updateLastOperation(instanceId, OperationState.FAILED)
      throw new Error('Error deprovisioning service instance')
    }
  }

  private requestNotSentFromIBM(
    createServiceRequest: CreateServiceInstanceRequest,
  ): boolean {
    return !(
      createServiceRequest.context &&
      createServiceRequest.context.platform === BrokerUtil.IBM_CLOUD
    )
  }

  private async getServiceMetaDataByAttribute(
    attribute: string,
  ): Promise<string | null> {
    const service = (await this.catalogService.getCatalog()).services[0]

    if (service && service.metadata) {
      if (
        Object.prototype.hasOwnProperty.call(service.metadata, attribute) &&
        service.metadata[attribute]
      ) {
        return service.metadata[attribute].toString()
      }
    }

    return null
  }

  public async lastOperation(instanceId: string, iamId: string): Promise<any> {
    try {
      logger.info(
        `last_operation Response status: 200, body: ${instanceId} ${iamId}`,
      )

      const response = {
        [BrokerServiceImpl.INSTANCE_STATE]:
          this.lastOperationStatus[instanceId] ?? OperationState.SUCCEEDED,
      }
      return response
    } catch (error) {
      logger.error('Error fetching last operation:', error)
      throw new Error('Error fetching last operation')
    }
  }

  public updateLastOperation(instanceId: string, state: OperationState): void {
    this.lastOperationStatus[instanceId] = state
  }

  public async updateState(
    instanceId: string,
    json: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    iamId: string,
  ): Promise<any> {
    try {
      const updateStateRequest: UpdateStateRequest = JSON.parse(
        JSON.stringify(json),
      )

      const response: ServiceInstanceStateResponse = {
        active: updateStateRequest.enabled || false,
        enabled: updateStateRequest.enabled || false,
      }

      return response
    } catch (error) {
      logger.error('Error updating service instance state:', error)
      throw new Error('Error updating service instance state')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async getState(instanceId: string, iamId: string): Promise<any> {
    try {
      const response: ServiceInstanceStateResponse = {
        active: false,
        enabled: false,
      }

      return response
    } catch (error) {
      logger.error('Error getting instance state:', error)
      throw new Error('Error getting instance state')
    }
  }

  private getServiceInstanceEntity(
    request: CreateServiceInstanceRequest,
    license: FloatingLicenses,
    iamId: string,
    region: string,
  ): ServiceInstance {
    const instance = new ServiceInstance()
    instance.instanceId = request.instanceId ?? ''
    instance.name = request.context?.name ?? ''
    instance.serviceId = request.service_id
    instance.pjsLicenseId = license.pjsLicenseId
    instance.puiLicenseId = license.puiLicenseId
    instance.pjsAuthorizationCode = license.pjsAuthorizationCode
    instance.puiAuthorizationCode = license.puiAuthorizationCode
    instance.planId = request.plan_id
    instance.iamId = iamId
    instance.region = region
    instance.context = JSON.stringify(request.context)
    instance.parameters = JSON.stringify(request.parameters)
    instance.status = ServiceInstanceStatus.ACTIVE
    instance.enabled = true
    instance.createDate = new Date()
    instance.updateDate = new Date()

    return instance
  }
}
