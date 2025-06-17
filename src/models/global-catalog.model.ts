import { Expose } from 'class-transformer'
import { IsArray, IsObject, IsOptional, IsString } from 'class-validator'

export class ServiceEntry {
  @IsString()
  name!: string

  @IsString()
  kind!: string

  @IsObject()
  @IsOptional()
  @Expose({ name: 'overview_ui' })
  overviewUI?: {
    en: {
      description: string
      long_description: string
      display_name: string
    }
  }

  @IsObject()
  images!: {
    image: string
    feature_image: string
    small_image: string
    medium_image: string
  }

  @IsObject()
  metadata!: {
    service: {
      bindable: boolean
      parameters: any
    }
    ui: {
      urls: {
        doc_url: string
        terms_url: string
        instructions_url: string
      }
    }
  }

  @IsString()
  id!: string

  @IsObject()
  visibility!: { restrictions: any }

  @IsArray()
  children!: ChildEntry[]

  @IsOptional()
  @IsString()
  created?: string

  @IsOptional()
  @IsString()
  updated?: string

  constructor(data: ServiceEntry) {
    if (data) {
      Object.assign(this, data)
    }
  }
}

export interface ChildEntry {
  name: string
  id: string
  metadata: {
    pricing: {
      url: string
      type: string
    }
    plan: {
      allow_internal_users: boolean
    }
  }
  overview_ui: {
    en: {
      display_name: string
      description: string
    }
  }
  created: string
  updated: string
}

export class PlanEntry {
  @IsString()
  type!: string

  @IsArray()
  metrics!: object[]

  constructor(data: PlanEntry) {
    if (data) {
      Object.assign(this, data)
    }
  }
}
