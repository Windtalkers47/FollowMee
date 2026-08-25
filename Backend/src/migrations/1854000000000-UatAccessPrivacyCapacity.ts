import { MigrationInterface, QueryRunner } from 'typeorm';

export class UatAccessPrivacyCapacity1854000000000 implements MigrationInterface {
  name = 'UatAccessPrivacyCapacity1854000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE registration_requests (
      requestId VARCHAR(36) NOT NULL, email VARCHAR(100) NOT NULL, userName VARCHAR(50) NOT NULL,
      userLastName VARCHAR(50) NOT NULL, userPhone1 VARCHAR(20) NULL, passwordHash VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending_email', verificationTokenHash CHAR(64) NULL,
      verificationExpiresAt DATETIME NULL, verifiedAt DATETIME NULL, reviewedBy INT NULL, reviewedAt DATETIME NULL,
      reviewReason VARCHAR(500) NULL, termsVersion VARCHAR(24) NOT NULL, privacyVersion VARCHAR(24) NOT NULL,
      consentAt DATETIME NOT NULL, ipHash CHAR(64) NULL, funnelSessionHash CHAR(64) NULL, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (requestId), UNIQUE KEY UQ_registration_request_email (email),
      KEY IDX_registration_status_created (status, createdAt),
      CONSTRAINT FK_registration_reviewed_by FOREIGN KEY (reviewedBy) REFERENCES users(userId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE privacy_requests (
      requestId VARCHAR(36) NOT NULL, email VARCHAR(100) NOT NULL, requestType VARCHAR(24) NOT NULL,
      message TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending_email', verificationTokenHash CHAR(64) NULL,
      verificationExpiresAt DATETIME NULL, verifiedAt DATETIME NULL, assignedTo INT NULL, resolvedAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (requestId), KEY IDX_privacy_request_status_created (status, createdAt),
      CONSTRAINT FK_privacy_request_assignee FOREIGN KEY (assignedTo) REFERENCES users(userId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE consent_records (
      consentId VARCHAR(36) NOT NULL, userId INT NULL, subjectHash CHAR(64) NULL, policyVersion VARCHAR(24) NOT NULL,
      categories JSON NOT NULL, source VARCHAR(24) NOT NULL, withdrawnAt DATETIME NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (consentId),
      KEY IDX_consent_user_created (userId, createdAt), KEY IDX_consent_subject_created (subjectHash, createdAt),
      CONSTRAINT FK_consent_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE system_capacity_alerts (
      alertId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, provider VARCHAR(24) NOT NULL, resource VARCHAR(64) NOT NULL,
      threshold TINYINT UNSIGNED NOT NULL, periodKey VARCHAR(16) NOT NULL, measuredPercent DECIMAL(7,2) NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (alertId),
      UNIQUE KEY UQ_capacity_alert_period (provider, resource, threshold, periodKey)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE product_funnel_events (
      eventId BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, eventType VARCHAR(32) NOT NULL, sessionHash CHAR(64) NOT NULL,
      userId INT NULL, metadata JSON NULL, occurredAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (eventId), KEY IDX_product_funnel_type_time (eventType, occurredAt), KEY IDX_product_funnel_session_time (sessionHash, occurredAt),
      CONSTRAINT FK_product_funnel_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE product_funnel_events');
    await queryRunner.query('DROP TABLE system_capacity_alerts');
    await queryRunner.query('DROP TABLE consent_records');
    await queryRunner.query('DROP TABLE privacy_requests');
    await queryRunner.query('DROP TABLE registration_requests');
  }
}
