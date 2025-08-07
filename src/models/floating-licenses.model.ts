export class FloatingLicenses {
  customerName: string
  customerId: number
  pjsLicenseId?: number
  puiLicenseId?: number
  pjsAuthorizationCode?: string
  puiAuthorizationCode?: string

  constructor(
    customerName: string,
    customerId: number,
    pjsLicenseId?: number,
    puiLicenseId?: number,
    pjsAuthorizationCode?: string,
    puiAuthorizationCode?: string,
  ) {
    this.customerName = customerName
    this.customerId = customerId
    this.pjsLicenseId = pjsLicenseId
    this.puiLicenseId = puiLicenseId
    this.pjsAuthorizationCode = pjsAuthorizationCode
    this.puiAuthorizationCode = puiAuthorizationCode
  }
}
