import {
  PublishCommand,
  PublishInput,
  SNSClient,
  SNSClientConfig,
} from '@aws-sdk/client-sns'
import { fromEnv } from '@aws-sdk/credential-provider-env'
import { BillingFailure } from '../db/entities/billing-failure.entity'

export interface NotificationOptions {
  subject: string
  message: string
}

export async function notify(options: NotificationOptions) {
  const topicARN = process.env.SNS_TOPIC_ARN || ''

  const config: SNSClientConfig = {
    credentials: fromEnv(),
  }
  const client = new SNSClient(config)
  const publishConfig: PublishInput = {
    TopicArn: topicARN,
    Message: options.message,
    Subject: options.subject,
  }
  const command = new PublishCommand(publishConfig)
  await client.send(command)
}

export async function getBillingFailureNotificationBody(
  failures: BillingFailure[],
): Promise<NotificationOptions> {
  const product = process.env.BROKER_PRODUCT || ''
  return {
    subject: `[Service Broker ${product}] Billing for ${failures.length} instances failed`,
    message: failures.reduce((content, failure) => {
      content += `${failure.message}\n\n`
      return content
    }, ''),
  }
}
