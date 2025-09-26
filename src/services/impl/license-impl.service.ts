import axios from 'axios'
import { FloatingLicenses } from '../../models/floating-licenses.model'
import { LicenseService } from '../license.service'
import { ServiceInstance } from '../../db/entities/service-instance.entity'
import { createHash } from 'crypto'

export class LicenseServiceImpl implements LicenseService {
  private pllsEndpoint = process.env.PLLS_URL || ''
  private pllsApiKey = process.env.PLLS_API_KEY || ''
  private pllsPUIModulesConcurrent = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PUI_MODULES_CONCURRENT || '',
  )
  private pllsPUIModulesNamed = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PUI_MODULES_NAMED || '',
  )
  private pllsPUIModulesNoLimit = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PUI_MODULES_NO_LIMIT || '',
  )
  private pllsPJSModulesConcurrent = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PJS_MODULES_CONCURRENT || '',
  )
  private pllsPJSModulesNamed = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PJS_MODULES_NAMED || '',
  )
  private pllsPJSModulesNoLimit = LicenseServiceImpl.parseModulesEnv(
    process.env.PLLS_PJS_MODULES_NO_LIMIT || '',
  )

  private static readonly CUSTOMER_PATH = '/customers/'
  private static readonly LICENSE_PATH = '/licenses/'
  private static readonly AUTHORIZATION_CODE_PATH =
    '/authorization_codes/generate'
  private static readonly LICENSE_SEATS = 50

  private static readonly PERMANENT = 1

  private static readonly NO_LIMIT = 0
  private static readonly CONCURRENT = 1
  private static readonly NAMED = 2

  private static readonly PJS_PRODUCT_ID = 1
  private static readonly PUI_PRODUCT_ID = 2

  async provisionFloatingLicenses(
    instanceId: string,
  ): Promise<FloatingLicenses> {
    const customerName = this.getCustomerName(instanceId)
    const customerId = await this.createCustomer(customerName)
    let pjsLicenseId = undefined
    let pjsAuthorizationCode = undefined
    if (this.productIncludesPJS()) {
      pjsLicenseId = await this.createLicense(
        customerId,
        LicenseServiceImpl.PJS_PRODUCT_ID,
      )
      pjsAuthorizationCode = await this.createAuthorizationCode(pjsLicenseId)
    }
    let puiLicenseId = undefined
    let puiAuthorizationCode = undefined
    if (this.productIncludesPUI()) {
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
    if (modules_string.length === 0) return []
    return modules_string.split(',').map(module_string => {
      return parseInt(module_string, 10)
    })
  }

  private productIncludesPJS(): boolean {
    return (
      this.pllsPJSModulesConcurrent.length > 0 ||
      this.pllsPJSModulesNamed.length > 0 ||
      this.pllsPJSModulesNoLimit.length > 0
    )
  }

  private productIncludesPUI(): boolean {
    return (
      this.pllsPUIModulesConcurrent.length > 0 ||
      this.pllsPUIModulesNamed.length > 0 ||
      this.pllsPUIModulesNoLimit.length > 0
    )
  }

  private getCustomerName(crnInstanceId: string): string {
    const instanceHash = createHash('sha256')
      .update(crnInstanceId)
      .digest('hex')
    return `IBMCloud-${instanceHash}`
  }

  private getHeaders(): any {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-plls-api-key': this.pllsApiKey,
    }
  }

  private async createCustomer(customerName: string): Promise<number> {
    const URL = `${this.pllsEndpoint}${LicenseServiceImpl.CUSTOMER_PATH}${customerName}`
    const response = await axios.post(
      URL,
      {},
      {
        headers: this.getHeaders(),
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.customer_id
    } else {
      throw new Error('Failed to create new PLLS Customer')
    }
  }

  private async getCustomer(customerName: string): Promise<number> {
    const URL = `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${customerName}`
    const response = await axios.get(URL, {
      headers: this.getHeaders(),
    })

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
    const URL = `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${customerId}`
    const response = await axios.post(
      URL,
      this.buildLicensePayload(LicenseServiceImpl.LICENSE_SEATS, product_id),
      {
        headers: this.getHeaders(),
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.license_id
    } else {
      throw new Error('Failed to create new PLLS License')
    }
  }

  private buildLicensePayload(licenseSeats: number, product_id: number) {
    const concurrent_modules =
      product_id === LicenseServiceImpl.PJS_PRODUCT_ID
        ? this.pllsPJSModulesConcurrent
        : this.pllsPUIModulesConcurrent
    const named_modules =
      product_id === LicenseServiceImpl.PJS_PRODUCT_ID
        ? this.pllsPJSModulesNamed
        : this.pllsPUIModulesNamed
    const no_limit_modules =
      product_id === LicenseServiceImpl.PJS_PRODUCT_ID
        ? this.pllsPJSModulesNoLimit
        : this.pllsPUIModulesNoLimit
    return {
      license_type: 2,
      floating: {
        seats_entitled: licenseSeats,
        pulse_ttl: 86400,
      },
      product_id,
      description: 'IBM Cloud License Key',
      modules: [
        ...concurrent_modules.map(pllsModule => {
          return {
            module_id: pllsModule,
            term_id: LicenseServiceImpl.PERMANENT,
            limit_id: LicenseServiceImpl.CONCURRENT,
            usage_limit: licenseSeats,
          }
        }),
        ...named_modules.map(pllsModule => {
          return {
            module_id: pllsModule,
            term_id: LicenseServiceImpl.PERMANENT,
            limit_id: LicenseServiceImpl.NAMED,
            usage_limit: licenseSeats,
          }
        }),
        ...no_limit_modules.map(pllsModule => {
          return {
            module_id: pllsModule,
            term_id: LicenseServiceImpl.PERMANENT,
            limit_id: LicenseServiceImpl.NO_LIMIT,
          }
        }),
      ],
    }
  }

  private async deleteLicense(licenseId: number) {
    const URL = `${this.pllsEndpoint}${LicenseServiceImpl.LICENSE_PATH}${licenseId}`
    await axios.delete(URL, {
      headers: this.getHeaders(),
    })
  }

  private async createAuthorizationCode(licenseId: number): Promise<string> {
    const URL = `${this.pllsEndpoint}${LicenseServiceImpl.AUTHORIZATION_CODE_PATH}`
    const response = await axios.post(
      URL,
      {
        license_id: licenseId,
        expires: this.getExpiresString(),
      },
      {
        headers: this.getHeaders(),
      },
    )

    if (response.data && typeof response.data === 'object') {
      return response.data.authorization_code
    } else {
      throw new Error('Failed to generate Authorization Code')
    }
  }

  private getExpiresString(): string {
    const expiresDate = new Date()
    expiresDate.setFullYear(expiresDate.getFullYear() + 5)
    const expiresISO = expiresDate.toISOString()
    return expiresISO.split('T')[0]
  }
}
