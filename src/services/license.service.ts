import { ServiceInstance } from '../db/entities/service-instance.entity'
import { FloatingLicenses } from '../models/floating-licenses.model'

export interface LicenseService {
  provisionFloatingLicense(instanceId: string): Promise<FloatingLicenses>
  deprovisionFloatingLicenses(instance: ServiceInstance): Promise<void>
}
