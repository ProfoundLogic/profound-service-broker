import { FloatingLicense } from '../models/floating-license.model'

export interface LicenseService {
  provisionFloatingLicense(instanceId: string): Promise<FloatingLicense>
  deprovisionFloatingLicense(instanceId: string): Promise<void>
}
