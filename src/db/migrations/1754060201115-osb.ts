import { MigrationInterface, QueryRunner } from 'typeorm'

export class Osb1754060201115 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "billing_failure" ("id" SERIAL NOT NULL, "payload" character varying NOT NULL, "message" character varying NOT NULL, "create_date" TIMESTAMP NOT NULL, "update_date" TIMESTAMP NOT NULL, CONSTRAINT "PK_billing_failure" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "billing_failure"`)
  }
}
