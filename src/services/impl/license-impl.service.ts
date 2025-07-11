import axios from 'axios'
import { FloatingLicense } from '../../models/floating-license.model'
import { LicenseService } from '../license.service'

export class LicenseServiceImpl implements LicenseService {
  private pllsEndpoint = process.env.PLLS_URL || ''
  private pllsApiKey = process.env.PLLS_API_KEY || ''
  private pllsModules = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_MODULES as string,
  )

  private static readonly API_KEY_HEADER = 'x-plls-api-key'
  private static readonly CUSTOMER_PATH = '/customers/ibm_cloud/'
  private static readonly LICENSE_PATH = '/licenses/ibm_cloud/'
  private static readonly AUTHORIZATION_CODE_PATH =
    '/authorization_codes/generate'
  private static readonly LICENSE_SEATS = 100

  async provisionFloatingLicense(instanceId: string): Promise<FloatingLicense> {
    const customerName = this.getCustomerName(instanceId)
    const customerId = await this.createCustomer(customerName)
    const licenseId = await this.createLicense(customerId)
    const authorizationCode = await this.createAuthorizationCode(licenseId)
    return new FloatingLicense(
      customerName,
      customerId,
      licenseId,
      authorizationCode,
    )
  }

  async deprovisionFloatingLicense(instanceId: string): Promise<void> {
    const customerName = this.getCustomerName(instanceId)
    const customerId = await this.getCustomer(customerName)
    await this.deleteLicense(customerId)
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

  private async createLicense(customerId: number): Promise<number> {
    const response = await axios.post(
      `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${customerId}`,
      this.buildLicensePayload(LicenseServiceImpl.LICENSE_SEATS),
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

  private buildLicensePayload(licenseSeats: number) {
    return {
      license_type: 2,
      floating: {
        seats_entitled: licenseSeats,
        pulse_ttl: 86400,
      },
      product_id: 1,
      description: 'IBM Cloud License Key',
      modules: this.pllsModules.map(pllsModule => {
        return {
          module_id: pllsModule,
          term_id: 1,
          limit_id: 1,
          usage_limit: licenseSeats,
        }
      }),
    }
  }

  private async deleteLicense(customerId: number) {
    await axios.delete(
      `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${customerId}`,
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
