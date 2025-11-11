import { MigrationInterface, QueryRunner } from 'typeorm'

export class Osb1761576594717 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_key" ("id" SERIAL NOT NULL, "uuid" character varying NOT NULL, "hash" character varying NOT NULL, "note" character varying NOT NULL, "expires" TIMESTAMP NOT NULL, "create_date" TIMESTAMP NOT NULL, "update_date" TIMESTAMP NOT NULL, CONSTRAINT "PK_api_key" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "api_key"`)
  }
}
