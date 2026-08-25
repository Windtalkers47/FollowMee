import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileConversionPlatform1850000000000 implements MigrationInterface {
  name = 'ProfileConversionPlatform1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const eventColumns = [
      ['visitorHash', 'CHAR(64) NULL AFTER referrer'],
      ['sessionId', 'VARCHAR(64) NULL AFTER visitorHash'],
      ['utmSource', 'VARCHAR(120) NULL AFTER sessionId'],
      ['utmMedium', 'VARCHAR(120) NULL AFTER utmSource'],
      ['utmCampaign', 'VARCHAR(120) NULL AFTER utmMedium'],
    ];
    for (const [column, definition] of eventColumns) {
      if (!(await queryRunner.hasColumn('public_profile_events', column))) await queryRunner.query(`ALTER TABLE public_profile_events ADD COLUMN ${column} ${definition}`);
    }
    await queryRunner.query(`CREATE TABLE public_profile_leads (
      leadId CHAR(36) NOT NULL, profileId VARCHAR(36) NOT NULL, name VARCHAR(120) NOT NULL,
      email VARCHAR(160) NULL, phone VARCHAR(32) NULL, message VARCHAR(1000) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'new', consentAt DATETIME NOT NULL,
      consentVersion VARCHAR(24) NOT NULL DEFAULT '2026-08', assignedTo INT NULL,
      convertedCustomerId VARCHAR(36) NULL, convertedAt DATETIME NULL,
      visitorHash CHAR(64) NULL, ipHash CHAR(64) NULL, userAgentHash CHAR(64) NULL,
      deviceType VARCHAR(20) NOT NULL DEFAULT 'unknown', referrer VARCHAR(512) NULL,
      utmSource VARCHAR(120) NULL, utmMedium VARCHAR(120) NULL, utmCampaign VARCHAR(120) NULL,
      anonymizedAt DATETIME NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (leadId), KEY IDX_profile_leads_profile_status_created (profileId,status,createdAt),
      KEY IDX_profile_leads_retention (status,createdAt),
      CONSTRAINT FK_profile_leads_profile FOREIGN KEY (profileId) REFERENCES public_profiles(profileId) ON DELETE CASCADE,
      CONSTRAINT FK_profile_leads_customer FOREIGN KEY (convertedCustomerId) REFERENCES customers(customerId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE public_profile_leads');
    for (const column of ['utmCampaign', 'utmMedium', 'utmSource', 'sessionId', 'visitorHash']) {
      if (await queryRunner.hasColumn('public_profile_events', column)) await queryRunner.query(`ALTER TABLE public_profile_events DROP COLUMN ${column}`);
    }
  }
}
