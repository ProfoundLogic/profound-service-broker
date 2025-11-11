import { Entity, Column } from 'typeorm'
import { BaseEntity } from './base.entity'

@Entity({ name: 'api_key' })
export class ApiKey extends BaseEntity {
  @Column({ name: 'uuid' })
  uuid!: string

  @Column({ name: 'hash' })
  hash!: string

  @Column({ name: 'note' })
  note!: string

  @Column({
    name: 'expires',
    type: 'timestamp',
  })
  expires!: Date
}
