import { Entity, Column, PrimaryColumn } from 'typeorm'
import { BaseEntity } from './base.entity'

@Entity({ name: 'service_instance' })
export class ServiceInstance extends BaseEntity {
  @PrimaryColumn({ name: 'instance_id' })
  instanceId!: string

  @Column({ nullable: true })
  name!: string

  @Column({ name: 'iam_id', nullable: true })
  iamId!: string

  @Column({ name: 'plan_id', nullable: true })
  planId!: string

  @Column({ name: 'service_id', nullable: true })
  serviceId!: string

  @Column({ name: 'pjs_license_id', nullable: true })
  pjsLicenseId?: number

  @Column({ name: 'pui_license_id', nullable: true })
  puiLicenseId?: number

  @Column({ name: 'pjs_authorization_code', nullable: true })
  pjsAuthorizationCode?: string

  @Column({ name: 'pui_authorization_code', nullable: true })
  puiAuthorizationCode?: string

  @Column({ nullable: true })
  status!: string

  @Column({ default: false })
  enabled!: boolean

  @Column({ nullable: true })
  region!: string

  @Column({ length: 1024, nullable: true })
  context!: string

  @Column({ nullable: true })
  parameters!: string
}
