export class FloatingLicense {
  customerName: string
  customerId: number
  licenseId: number
  authorizationCode: string

  constructor(
    customerName: string,
    customerId: number,
    licenseId: number,
    authorizationCode: string,
  ) {
    this.customerName = customerName
    this.customerId = customerId
    this.licenseId = licenseId
    this.authorizationCode = authorizationCode
  }
}
