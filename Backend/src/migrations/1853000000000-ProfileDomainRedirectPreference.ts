import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileDomainRedirectPreference1853000000000 implements MigrationInterface {
  name = 'ProfileDomainRedirectPreference1853000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE public_profile_domains ADD COLUMN redirectToCanonical TINYINT(1) NOT NULL DEFAULT 1 AFTER isCanonical");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE public_profile_domains DROP COLUMN redirectToCanonical');
  }
}
