import { MigrationInterface, QueryRunner } from 'typeorm'

export class Osb1751394431593 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_instance" ADD "authorization_code" character varying NOT NULL`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "service_instance" DROP COLUMN "authorization_code"`,
    )
  }
}
