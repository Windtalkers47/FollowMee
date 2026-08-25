import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileTrustCampaign1851000000000 implements MigrationInterface {
  name = 'ProfileTrustCampaign1851000000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE public_profiles ADD COLUMN publishStartAt DATETIME NULL AFTER publishedAt, ADD COLUMN publishEndAt DATETIME NULL AFTER publishStartAt');
    await queryRunner.query(`CREATE TABLE public_profile_revisions (revisionId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, profileId VARCHAR(36) NOT NULL, version INT UNSIGNED NOT NULL, snapshot JSON NOT NULL, actorUserId INT NULL, reason VARCHAR(24) NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (revisionId), UNIQUE KEY UQ_profile_revision_version (profileId,version), CONSTRAINT FK_profile_revisions_profile FOREIGN KEY (profileId) REFERENCES public_profiles(profileId) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE public_profile_link_checks (checkId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, profileId VARCHAR(36) NOT NULL, targetKey VARCHAR(64) NOT NULL, url VARCHAR(512) NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'unchecked', httpStatus SMALLINT UNSIGNED NULL, detail VARCHAR(255) NULL, checkedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (checkId), KEY IDX_profile_link_checks_profile_target (profileId,targetKey,checkedAt), CONSTRAINT FK_profile_link_checks_profile FOREIGN KEY (profileId) REFERENCES public_profiles(profileId) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE customer_merge_snapshots (snapshotId CHAR(36) NOT NULL, sourceCustomerId CHAR(36) NOT NULL, targetCustomerId CHAR(36) NOT NULL, sourceSnapshot JSON NOT NULL, targetSnapshot JSON NOT NULL, actorUserId INT NOT NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (snapshotId), KEY IDX_customer_merge_pair (sourceCustomerId,targetCustomerId,createdAt)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE customer_merge_snapshots');
    await queryRunner.query('DROP TABLE public_profile_link_checks');
    await queryRunner.query('DROP TABLE public_profile_revisions');
    await queryRunner.query('ALTER TABLE public_profiles DROP COLUMN publishEndAt, DROP COLUMN publishStartAt');
  }
}
