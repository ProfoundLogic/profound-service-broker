import axios, { AxiosError, AxiosResponse } from 'axios'
import { MeteringPayload } from '../../models/metering-payload.model'
import { UsageService } from '../usage.service'
import logger from '../../utils/logger'
import { IAMService } from '../iam.service'

export class UsageServiceImpl implements UsageService {
  private usageEndpoint: string = process.env.USAGE_ENDPOINT || ''

  private static readonly USAGE_API_PATH =
    '/v4/metering/resources/{resource_id}/usage'

  constructor(private IAMService: IAMService) {}

  public async sendUsageData(
    resourceId: string,
    meteringPayload: MeteringPayload,
  ): Promise<string> {
    try {
      if (meteringPayload.start === 0) {
        const instant = Date.now()
        meteringPayload.start = instant - 3600000
      }
      if (meteringPayload.end === 0) {
        const instant = Date.now()
        meteringPayload.end = instant
      }

      const iamAccessToken = await this.IAMService.getAccessToken()
      const usageApiUrl = this.usageEndpoint.concat(
        UsageServiceImpl.USAGE_API_PATH.replace('{resource_id}', resourceId),
      )
      const response = await this.sendUsageDataToApi(
        usageApiUrl,
        iamAccessToken,
        [meteringPayload],
      )

      logger.info('Usage Metering response:', response.data)

      if (response.status === 202) {
        const responseJson = response.data.resources
        responseJson.forEach((resp: any) => {
          if (resp.status && resp.status !== 201) {
            logger.error(
              'ALERT: Error response from Metering Usage API:',
              JSON.stringify(resp),
            )
          }
        })
        return JSON.stringify(responseJson)
      } else {
        logger.error(
          'Error while sending USAGE data:',
          `response status code: ${response.status}`,
          `response body: ${JSON.stringify(response.data)}`,
        )
        return JSON.stringify(response.data)
      }
    } catch (error) {
      logger.error('Error sending usage data:', error)
      throw new Error('Error sending usage data')
    }
  }

  private async sendUsageDataToApi(
    url: string,
    token: string,
    data: MeteringPayload[],
  ): Promise<AxiosResponse> {
    try {
      const response = await axios.post(url, data, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      return response
    } catch (error) {
      const axiosError = error as AxiosError

      if (axiosError.response) {
        logger.error('Failed with status:', axiosError.response.status)
        logger.error('Failed with response:', axiosError.response.data)
      }
      throw error
    }
  }
}
