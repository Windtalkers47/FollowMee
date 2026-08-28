import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegistrationVerificationIndex1855000000000 implements MigrationInterface {
  name = 'RegistrationVerificationIndex1855000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX UQ_registration_verification_token
      ON registration_requests (verificationTokenHash)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX UQ_registration_verification_token ON registration_requests');
  }
}
