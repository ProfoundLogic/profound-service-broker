import { Entity, Column } from 'typeorm'
import { BaseEntity } from './base.entity'

@Entity({ name: 'billing_failure' })
export class BillingFailure extends BaseEntity {
  @Column({ name: 'payload' })
  payload!: string

  @Column({ name: 'message' })
  message!: string
}
