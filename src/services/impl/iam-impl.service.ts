import axios from 'axios'
import { IAMService } from '../iam.service'

export class IAMServiceImpl implements IAMService {
  private iamEndpoint: string = process.env.IAM_ENDPOINT || ''
  private apiKey: string = process.env.IAM_API_KEY || ''

  private static readonly IAM_IDENTITY_TOKEN_PATH = '/identity/token'
  private static readonly IAM_GRANT_TYPE =
    'urn:ibm:params:oauth:grant-type:apikey'

  async getAccessToken(): Promise<string> {
    const response = await axios.post(
      `${this.iamEndpoint}${IAMServiceImpl.IAM_IDENTITY_TOKEN_PATH}`,
      {
        grant_type: IAMServiceImpl.IAM_GRANT_TYPE,
        apikey: this.apiKey,
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      },
    )

    if (response.data && response.data.access_token) {
      return response.data.access_token
    } else {
      throw new Error('Failed to retrieve IAM access token')
    }
  }
}
