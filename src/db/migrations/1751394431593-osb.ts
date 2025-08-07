import { MigrationInterface, QueryRunner } from 'typeorm'

export class Osb1751394431593 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_instance"
        ADD COLUMN "pjs_license_id" integer,
        ADD COLUMN "pui_license_id" integer,
        ADD COLUMN "pjs_authorization_code" character varying,
        ADD COLUMN "pui_authorization_code" character varying`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_instance"
        DROP COLUMN "pjs_license_id",
        DROP COLUMN "pui_license_id",
        DROP COLUMN "pjs_authorization_code",
        DROP COLUMN "pui_authorization_code"`,
    )
  }
}
