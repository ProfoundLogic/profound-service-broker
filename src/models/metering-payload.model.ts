import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { MeasuredUsage } from './measured-usage.model'
import { Expose } from 'class-transformer'

export class MeteringPayload {
  @IsNotEmpty()
  @IsString()
  @Expose({ name: 'plan_id' })
  planId: string

  @IsNotEmpty()
  @IsString()
  @Expose({ name: 'resource_instance_id' })
  resourceInstanceId: string

  @IsNumber()
  @IsNotEmpty()
  start: number

  @IsNumber()
  @IsNotEmpty()
  end: number

  @IsString()
  @IsNotEmpty()
  region: string

  @IsNotEmpty()
  @Expose({ name: 'measured_usage' })
  measuredUsage: MeasuredUsage[]

  constructor(
    planId: string,
    resourceInstanceId: string,
    start: number,
    end: number,
    region: string,
    measuredUsage: MeasuredUsage[],
  ) {
    this.planId = planId
    this.resourceInstanceId = resourceInstanceId
    this.start = start
    this.end = end
    this.region = region
    this.measuredUsage = measuredUsage
  }

  toString(): string {
    return `MeteringPayload{planId='${this.planId}', instanceId='${this.resourceInstanceId}', startTime='${this.start}', endTime=${this.end}, MeasuredUsage=${JSON.stringify(this.measuredUsage)}}`
  }
}
