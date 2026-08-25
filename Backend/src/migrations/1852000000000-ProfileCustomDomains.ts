import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileCustomDomains1852000000000 implements MigrationInterface {
  name = 'ProfileCustomDomains1852000000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE public_profile_domains (domainId CHAR(36) NOT NULL, profileId VARCHAR(36) NOT NULL, hostname VARCHAR(253) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'pending', verification JSON NULL, isCanonical TINYINT(1) NOT NULL DEFAULT 0, verifiedAt DATETIME NULL, lastCheckedAt DATETIME NULL, lastError VARCHAR(500) NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (domainId), UNIQUE KEY UQ_profile_domain_hostname (hostname), KEY IDX_profile_domain_profile (profileId), CONSTRAINT FK_profile_domains_profile FOREIGN KEY (profileId) REFERENCES public_profiles(profileId) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public_profile_domains');
  }
}
