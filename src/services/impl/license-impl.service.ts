import axios from 'axios'
import { FloatingLicenses } from '../../models/floating-licenses.model'
import { LicenseService } from '../license.service'
import { ServiceInstance } from '../../db/entities/service-instance.entity'

export class LicenseServiceImpl implements LicenseService {
  private pllsEndpoint = process.env.PLLS_URL || ''
  private pllsApiKey = process.env.PLLS_API_KEY || ''
  private pllsPUIModules = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PUI_MODULES || '',
  )
  private pllsPJSModules = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PJS_MODULES || '',
  )

  private static readonly API_KEY_HEADER = 'x-plls-api-key'
  private static readonly CUSTOMER_PATH = '/customers/'
  private static readonly LICENSE_PATH = '/licenses/'
  private static readonly AUTHORIZATION_CODE_PATH =
    '/authorization_codes/generate'
  private static readonly LICENSE_SEATS = 50
  private static readonly PJS_PRODUCT_ID = 1
  private static readonly PUI_PRODUCT_ID = 2

  async provisionFloatingLicense(
    instanceId: string,
  ): Promise<FloatingLicenses> {
    const customerName = this.getCustomerName(instanceId)
    const customerId = await this.createCustomer(customerName)
    let pjsLicenseId = undefined
    let pjsAuthorizationCode = undefined
    if (this.pllsPJSModules.length > 0) {
      pjsLicenseId = await this.createLicense(
        customerId,
        LicenseServiceImpl.PJS_PRODUCT_ID,
      )
      pjsAuthorizationCode = await this.createAuthorizationCode(pjsLicenseId)
    }
    let puiLicenseId = undefined
    let puiAuthorizationCode = undefined
    if (this.pllsPUIModules.length > 0) {
      puiLicenseId = await this.createLicense(
        customerId,
        LicenseServiceImpl.PUI_PRODUCT_ID,
      )
      puiAuthorizationCode = await this.createAuthorizationCode(puiLicenseId)
    }
    return new FloatingLicenses(
      customerName,
      customerId,
      pjsLicenseId,
      puiLicenseId,
      pjsAuthorizationCode,
      puiAuthorizationCode,
    )
  }

  async deprovisionFloatingLicenses(instance: ServiceInstance): Promise<void> {
    if (instance.pjsLicenseId) {
      await this.deleteLicense(instance.pjsLicenseId)
    }
    if (instance.puiLicenseId) {
      await this.deleteLicense(instance.puiLicenseId)
    }
  }

  private static parseModulesEnv(modules_string: string): number[] {
    return modules_string.split(',').map(module_string => {
      return parseInt(module_string, 10)
    })
  }

  private getCustomerName(instanceId: string): string {
    return `ibm-cloud-${instanceId}`
  }

  private async createCustomer(customerName: string): Promise<number> {
    const response = await axios.post(
      `${this.pllsEndpoint}${LicenseServiceImpl.CUSTOMER_PATH}${customerName}`,
      {
        headers: {
          Accept: 'application/json',
          [LicenseServiceImpl.API_KEY_HEADER]: this.pllsApiKey,
        },
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.customer_id
    } else {
      throw new Error('Failed to create new PLLS Customer')
    }
  }

  private async getCustomer(customerName: string): Promise<number> {
    const response = await axios.get(
      `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${customerName}`,
      {
        headers: {
          Accept: 'application/json',
          [LicenseServiceImpl.API_KEY_HEADER]: this.pllsApiKey,
        },
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.customer_id
    } else {
      throw new Error('Failed to get PLLS Customer')
    }
  }

  private async createLicense(
    customerId: number,
    product_id: number,
  ): Promise<number> {
    const response = await axios.post(
      `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${customerId}`,
      this.buildLicensePayload(LicenseServiceImpl.LICENSE_SEATS, product_id),
      {
        headers: {
          Accept: 'application/json',
          [LicenseServiceImpl.API_KEY_HEADER]: this.pllsApiKey,
        },
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.license_id
    } else {
      throw new Error('Failed to create new PLLS License')
    }
  }

  private buildLicensePayload(licenseSeats: number, product_id: number) {
    const modules_env =
      product_id === LicenseServiceImpl.PJS_PRODUCT_ID
        ? this.pllsPJSModules
        : this.pllsPUIModules
    return {
      license_type: 2,
      floating: {
        seats_entitled: licenseSeats,
        pulse_ttl: 86400,
      },
      product_id,
      description: 'IBM Cloud License Key',
      modules: modules_env.map(pllsModule => {
        return {
          module_id: pllsModule,
          term_id: 1,
          limit_id: 1,
          usage_limit: licenseSeats,
        }
      }),
    }
  }

  private async deleteLicense(licenseId: number) {
    await axios.delete(
      `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${licenseId}`,
      {
        headers: {
          Accept: 'application/json',
          [LicenseServiceImpl.API_KEY_HEADER]: this.pllsApiKey,
        },
      },
    )
  }

  private async createAuthorizationCode(licenseId: number): Promise<string> {
    const response = await axios.post(
      `${this.pllsEndpoint}${LicenseServiceImpl.AUTHORIZATION_CODE_PATH}`,
      {
        license_id: licenseId,
      },
      {
        headers: {
          Accept: 'application/json',
          [LicenseServiceImpl.API_KEY_HEADER]: this.pllsApiKey,
        },
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.authorization_code
    } else {
      throw new Error('Failed to generate Authorization Code')
    }
  }
}
