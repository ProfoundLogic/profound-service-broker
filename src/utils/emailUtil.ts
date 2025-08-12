import { createTransport } from 'nodemailer'
import { BillingFailure } from '../db/entities/billing-failure.entity'

export interface EmailOptions {
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions) {
  const smtpHost: string = process.env.SMTP_HOST || ''
  const smtpPort: number = Number(process.env.SMTP_PORT) || 0
  const smtpTLS: boolean = process.env.SMTP_TLS === 'true'
  const smtpVerifyCert: boolean = process.env.SMTP_VERIFY_CERT === 'true'
  const smtpUser: string = process.env.SMTP_USER || ''
  const smtpPassword: string = process.env.SMTP_PASSWORD || ''
  const smtpFrom: string = process.env.SMTP_FROM || ''
  const smtpTo: string = process.env.SMTP_TO || ''
  const transporter = createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpTLS,
    tls: {
      rejectUnauthorized: smtpVerifyCert,
    },
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  })
  await transporter.sendMail({
    from: smtpFrom,
    to: smtpTo,
    subject: options.subject,
    html: options.html,
  })
}

export async function getBillingFailureEmailContent(
  failures: BillingFailure[],
): Promise<EmailOptions> {
  const product = process.env.BROKER_PRODUCT || ''
  return {
    subject: `[Service Broker ${product}] Billing for ${failures.length} instances failed`,
    html: failures.reduce((content, failure) => {
      content += `<p>${failure.message}</p>`
      return content
    }, ''),
  }
}
