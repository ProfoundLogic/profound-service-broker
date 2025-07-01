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
import { CatalogServiceImpl } from './catalog-impl.service'
import { LicenseServiceImpl } from './license-impl.service'
import { FloatingLicense } from '../../models/floating-license.model'

export class BrokerServiceImpl implements BrokerService {
  dashboardUrl: string = process.env.DASHBOARD_URL || 'http://localhost:8080'
  private catalogService: CatalogServiceImpl
  private licenseService: LicenseServiceImpl

  private static readonly INSTANCE_STATE = 'state'
  private static readonly DISPLAY_NAME = 'displayName'
  private static readonly PROVISION_STATUS_API = '/provision_status?type='
  private static readonly INSTANCE_ID = '&instance_id='

  constructor() {
    this.catalogService = new CatalogServiceImpl()
    this.licenseService = new LicenseServiceImpl()
  }

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

      const floatingLicense =
        await this.licenseService.provisionFloatingLicense(instanceId)

      const serviceInstance = this.getServiceInstanceEntity(
        createServiceRequest,
        floatingLicense,
        iamId,
        region,
      )

      const serviceInstanceRepository =
        AppDataSource.getRepository(ServiceInstance)
      await serviceInstanceRepository.save(serviceInstance)

      logger.info(
        `Service Instance created: instanceId: ${instanceId} status: ${serviceInstance.status} planId: ${plan.id}`,
      )

      const displayName = await this.getServiceMetaDataByAttribute(
        BrokerServiceImpl.DISPLAY_NAME,
      )
      const responseUrl = `${process.env.DASHBOARD_URL}${BrokerServiceImpl.PROVISION_STATUS_API}${displayName || (await this.catalogService.getCatalog()).getServiceDefinitions()[0].name}${BrokerServiceImpl.INSTANCE_ID}${instanceId}`

      return plainToInstance(CreateServiceInstanceResponse, {
        dashboardUrl: responseUrl,
      })
    } catch (error) {
      logger.error('Error provisioning service instance:', error)
      throw new Error('Error provisioning service instance')
    }
  }

  public async deprovision(instanceId: string): Promise<boolean> {
    try {
      const serviceInstanceRepository =
        AppDataSource.getRepository(ServiceInstance)
      await this.licenseService.deprovisionFloatingLicense(instanceId)
      await serviceInstanceRepository.delete({ instanceId })
      return true
    } catch (error) {
      logger.error('Error deprovisioning service instance:', error)
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
        [BrokerServiceImpl.INSTANCE_STATE]: OperationState.SUCCEEDED,
      }
      return response
    } catch (error) {
      logger.error('Error fetching last operation:', error)
      throw new Error('Error fetching last operation')
    }
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
    license: FloatingLicense,
    iamId: string,
    region: string,
  ): ServiceInstance {
    const instance = new ServiceInstance()
    instance.instanceId = request.instanceId ?? ''
    instance.name = request.context?.name ?? ''
    instance.serviceId = request.service_id
    instance.authorizationCode = license.authorizationCode
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
