-- FollowMee clean schema
-- Schema version: 2026-08-25 / UAT access, privacy and capacity monitoring
-- MySQL 8.0+ / MariaDB 10.6+
--
-- WARNING: This script drops every FollowMee table and all data in it.
-- Export the current database before running this file.
--
-- PowerShell (MariaDB client):
--   Get-Content -Raw .\database\followmee-clean-schema.sql | mariadb --host=localhost --port=3306 --user=root --password
-- Command Prompt / macOS / Linux:
--   mariadb --host=localhost --port=3306 --user=root --password < database/followmee-clean-schema.sql
--
-- The script creates/selects `followmee` and recreates every table plus its
-- indexes, constraints and foreign-key relations. Change both `followmee`
-- identifiers below when using a disposable database such as `followmee_e2e`.

CREATE DATABASE IF NOT EXISTS `followmee`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `followmee`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `outbox_events`;
DROP TABLE IF EXISTS `reward_season_results`;
DROP TABLE IF EXISTS `customer_activities`;
DROP TABLE IF EXISTS `task_checklist_items`;
DROP TABLE IF EXISTS `task_recurrence_rules`;
DROP TABLE IF EXISTS `task_templates`;
DROP TABLE IF EXISTS `user_saved_views`;
DROP TABLE IF EXISTS `organization_invitations`;
DROP TABLE IF EXISTS `reward_redemptions`;
DROP TABLE IF EXISTS `reward_catalog_items`;
DROP TABLE IF EXISTS `mission_progress_events`;
DROP TABLE IF EXISTS `user_mission_progress`;
DROP TABLE IF EXISTS `mission_instances`;
DROP TABLE IF EXISTS `mission_templates`;
DROP TABLE IF EXISTS `user_badges`;
DROP TABLE IF EXISTS `reward_badges`;
DROP TABLE IF EXISTS `reward_point_ledger`;
DROP TABLE IF EXISTS `reward_wallets`;
DROP TABLE IF EXISTS `reward_seasons`;
DROP TABLE IF EXISTS `reward_settings`;
DROP TABLE IF EXISTS `system_owner`;
DROP TABLE IF EXISTS `notification_metrics`;
DROP TABLE IF EXISTS `notification_group_actors`;
DROP TABLE IF EXISTS `notification_recipients`;
DROP TABLE IF EXISTS `notification_queue`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `push_subscriptions`;
DROP TABLE IF EXISTS `user_preferences`;
DROP TABLE IF EXISTS `user_notification_settings`;
DROP TABLE IF EXISTS `comment_reactions`;
DROP TABLE IF EXISTS `task_likes`;
DROP TABLE IF EXISTS `task_images`;
DROP TABLE IF EXISTS `task_comments`;
DROP TABLE IF EXISTS `task_activities`;
DROP TABLE IF EXISTS `task_watchers`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `user_audit_logs`;
DROP TABLE IF EXISTS `customer_merge_snapshots`;
DROP TABLE IF EXISTS `product_funnel_events`;
DROP TABLE IF EXISTS `system_capacity_alerts`;
DROP TABLE IF EXISTS `consent_records`;
DROP TABLE IF EXISTS `privacy_requests`;
DROP TABLE IF EXISTS `registration_requests`;
DROP TABLE IF EXISTS `public_profile_domains`;
DROP TABLE IF EXISTS `public_profile_link_checks`;
DROP TABLE IF EXISTS `public_profile_revisions`;
DROP TABLE IF EXISTS `public_profile_leads`;
DROP TABLE IF EXISTS `public_profile_events`;
DROP TABLE IF EXISTS `public_profile_links`;
DROP TABLE IF EXISTS `public_profiles`;
DROP TABLE IF EXISTS `user_profiles`;
DROP TABLE IF EXISTS `customers`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `migrations`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `userId` INT NOT NULL AUTO_INCREMENT,
  `userName` VARCHAR(50) NOT NULL,
  `userLastName` VARCHAR(50) NOT NULL,
  `userEmail` VARCHAR(191) NOT NULL,
  `userPassword` VARCHAR(255) NOT NULL,
  `userPhone1` VARCHAR(20) NULL,
  `userPhone2` VARCHAR(20) NULL,
  `userImageUrl` VARCHAR(500) NULL,
  `imageCrop` JSON NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `resetToken` VARCHAR(255) NULL,
  `resetTokenExpires` DATETIME NULL,
  `loginAttempts` INT NOT NULL DEFAULT 0,
  `lastLoginAttempt` DATETIME NULL,
  `lockedUntil` DATETIME NULL,
  `lastLogin` DATETIME NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`userId`),
  UNIQUE KEY `uq_users_email` (`userEmail`),
  KEY `idx_users_active_deleted` (`isActive`, `deletedAt`),
  KEY `idx_users_locked_until` (`lockedUntil`),
  CONSTRAINT `chk_users_login_attempts` CHECK (`loginAttempts` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_profiles` (
  `userProfileId` BIGINT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `handle` VARCHAR(32) NOT NULL,
  `headline` VARCHAR(140) NULL,
  `bio` VARCHAR(500) NULL,
  `themeConfig` JSON NULL,
  `visibility` ENUM('public','unlisted','private') NOT NULL DEFAULT 'private',
  `status` ENUM('draft','published') NOT NULL DEFAULT 'draft',
  `publishedAt` DATETIME NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`userProfileId`),
  UNIQUE KEY `uq_user_profiles_user` (`userId`),
  UNIQUE KEY `uq_user_profiles_handle` (`handle`),
  KEY `idx_user_profiles_public` (`handle`,`status`,`visibility`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `customerId` VARCHAR(36) NOT NULL,
  `userId` INT NULL,
  `assignedTo` INT NULL,
  `createdBy` INT NULL,
  `updatedBy` INT NULL,
  `customerName` VARCHAR(50) NOT NULL,
  `customerLastName` VARCHAR(50) NULL,
  `customerEmail` VARCHAR(191) NOT NULL,
  `customerPhone1` VARCHAR(20) NULL,
  `customerPhone2` VARCHAR(20) NULL,
  `customerFacebook` VARCHAR(255) NULL,
  `customerInstagram` VARCHAR(255) NULL,
  `customerTikTok` VARCHAR(255) NULL,
  `customerLine` VARCHAR(255) NULL,
  `customerX` VARCHAR(255) NULL,
  `customerAddress` VARCHAR(500) NULL,
  `customerImageUrl` VARCHAR(512) NULL,
  `imageCrop` JSON NULL,
  `status` ENUM('active', 'inactive', 'canceled') NOT NULL DEFAULT 'active',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`customerId`),
  UNIQUE KEY `uq_customers_email` (`customerEmail`),
  KEY `idx_customers_owner` (`userId`),
  KEY `idx_customers_assigned_to` (`assignedTo`),
  KEY `idx_customers_status_deleted` (`status`, `deletedAt`),
  KEY `idx_customers_status_created` (`status`, `createdAt`, `customerId`),
  KEY `idx_customers_name` (`customerName`, `customerLastName`),
  CONSTRAINT `fk_customers_owner`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_customers_assigned_to`
    FOREIGN KEY (`assignedTo`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer ownership is resource-scoped. Public profiles are an explicit publishing
-- layer with independent lifecycle, privacy controls and analytics.
CREATE TABLE `customer_activities` (
  `activityId` BIGINT NOT NULL AUTO_INCREMENT, `customerId` VARCHAR(36) NOT NULL, `actorUserId` INT NULL,
  `activityType` VARCHAR(60) NOT NULL, `metadata` JSON NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`activityId`), KEY `idx_customer_activity` (`customerId`,`createdAt`),
  CONSTRAINT `fk_customer_activity_customer` FOREIGN KEY (`customerId`) REFERENCES `customers` (`customerId`) ON DELETE CASCADE,
  CONSTRAINT `fk_customer_activity_actor` FOREIGN KEY (`actorUserId`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `public_profiles` (
  `profileId` VARCHAR(36) NOT NULL,
  `userId` INT NOT NULL,
  `createdBy` INT NULL,
  `updatedBy` INT NULL,
  `customerId` VARCHAR(36) NULL,
  `slug` VARCHAR(64) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `headline` VARCHAR(140) NULL,
  `bio` VARCHAR(500) NULL,
  `avatarUrl` VARCHAR(512) NULL,
  `imageCrop` JSON NULL,
  `templateKey` VARCHAR(32) NOT NULL DEFAULT 'soft-mint',
  `themeConfig` JSON NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `visibility` ENUM('public', 'unlisted', 'private') NOT NULL DEFAULT 'private',
  `primaryCtaLabel` VARCHAR(60) NULL,
  `primaryCtaUrl` VARCHAR(512) NULL,
  `secondaryCtaLabel` VARCHAR(60) NULL,
  `secondaryCtaUrl` VARCHAR(512) NULL,
  `showEmail` TINYINT(1) NOT NULL DEFAULT 0,
  `showPhone` TINYINT(1) NOT NULL DEFAULT 0,
  `showAddress` TINYINT(1) NOT NULL DEFAULT 0,
  `seoTitle` VARCHAR(70) NULL,
  `seoDescription` VARCHAR(160) NULL,
  `viewCount` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `publishedAt` DATETIME NULL,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`profileId`),
  UNIQUE KEY `UQ_public_profiles_slug` (`slug`),
  UNIQUE KEY `UQ_public_profiles_customer` (`customerId`),
  KEY `IDX_public_profiles_owner_status` (`userId`, `status`),
  CONSTRAINT `FK_public_profiles_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `FK_public_profiles_customer`
    FOREIGN KEY (`customerId`) REFERENCES `customers` (`customerId`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `public_profile_links` (
  `linkId` INT NOT NULL AUTO_INCREMENT,
  `profileId` VARCHAR(36) NOT NULL,
  `platform` VARCHAR(32) NOT NULL,
  `label` VARCHAR(60) NOT NULL,
  `url` VARCHAR(512) NOT NULL,
  `sortOrder` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `isVisible` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`linkId`),
  KEY `IDX_public_profile_links_order` (`profileId`, `sortOrder`),
  CONSTRAINT `FK_public_profile_links_profile`
    FOREIGN KEY (`profileId`) REFERENCES `public_profiles` (`profileId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `public_profile_events` (
  `eventId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `profileId` VARCHAR(36) NOT NULL,
  `eventType` VARCHAR(32) NOT NULL,
  `target` VARCHAR(128) NULL,
  `deviceType` VARCHAR(20) NOT NULL DEFAULT 'unknown',
  `ipHash` CHAR(64) NULL,
  `userAgentHash` CHAR(64) NULL,
  `referrer` VARCHAR(512) NULL,
  `occurredAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`eventId`),
  KEY `IDX_public_profile_events_profile_date` (`profileId`, `occurredAt`),
  KEY `IDX_public_profile_events_profile_type` (`profileId`, `eventType`),
  CONSTRAINT `FK_public_profile_events_profile`
    FOREIGN KEY (`profileId`) REFERENCES `public_profiles` (`profileId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `roleId` INT NOT NULL AUTO_INCREMENT,
  `roleName` VARCHAR(50) NOT NULL,
  `description` VARCHAR(255) NULL,
  `roleLevel` INT NOT NULL DEFAULT 1,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`roleId`),
  UNIQUE KEY `uq_roles_name` (`roleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `permissionId` INT NOT NULL AUTO_INCREMENT,
  `permissionName` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`permissionId`),
  UNIQUE KEY `uq_permissions_name` (`permissionName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_roles` (
  `userId` INT NOT NULL,
  `roleId` INT NOT NULL,
  PRIMARY KEY (`userId`, `roleId`),
  KEY `idx_user_roles_role_user` (`roleId`, `userId`),
  CONSTRAINT `fk_user_roles_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_roles_role`
    FOREIGN KEY (`roleId`) REFERENCES `roles` (`roleId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `roleId` INT NOT NULL,
  `permissionId` INT NOT NULL,
  PRIMARY KEY (`roleId`, `permissionId`),
  KEY `idx_role_permissions_permission_role` (`permissionId`, `roleId`),
  CONSTRAINT `fk_role_permissions_role`
    FOREIGN KEY (`roleId`) REFERENCES `roles` (`roleId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_role_permissions_permission`
    FOREIGN KEY (`permissionId`) REFERENCES `permissions` (`permissionId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `outbox_events` (
  `eventId` BIGINT NOT NULL AUTO_INCREMENT, `eventType` VARCHAR(100) NOT NULL, `aggregateType` VARCHAR(60) NULL,
  `aggregateId` VARCHAR(100) NULL, `payload` JSON NOT NULL, `idempotencyKey` VARCHAR(190) NOT NULL,
  `status` ENUM('pending','processing','processed','failed','dead') NOT NULL DEFAULT 'pending', `attempts` INT NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `lockedAt` DATETIME NULL, `lockedBy` VARCHAR(100) NULL,
  `processedAt` DATETIME NULL, `deadAt` DATETIME NULL, `lastError` VARCHAR(1000) NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`eventId`), UNIQUE KEY `uq_outbox_idempotency` (`idempotencyKey`),
  KEY `idx_outbox_claim` (`status`,`nextAttemptAt`,`eventId`), KEY `idx_outbox_aggregate` (`aggregateType`,`aggregateId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `organization_invitations` (
  `invitationId` BIGINT NOT NULL AUTO_INCREMENT, `email` VARCHAR(191) NOT NULL, `tokenHash` CHAR(64) NOT NULL,
  `roleId` INT NULL, `invitedBy` INT NOT NULL, `status` ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
  `expiresAt` DATETIME NOT NULL, `acceptedAt` DATETIME NULL, `revokedAt` DATETIME NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`invitationId`), UNIQUE KEY `uq_invitation_token` (`tokenHash`), KEY `idx_invitation_email_status` (`email`,`status`),
  CONSTRAINT `fk_invitation_role` FOREIGN KEY (`roleId`) REFERENCES `roles` (`roleId`) ON DELETE SET NULL,
  CONSTRAINT `fk_invitation_inviter` FOREIGN KEY (`invitedBy`) REFERENCES `users` (`userId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_saved_views` (
  `viewId` BIGINT NOT NULL AUTO_INCREMENT, `userId` INT NOT NULL, `pageKey` VARCHAR(60) NOT NULL, `name` VARCHAR(80) NOT NULL,
  `filters` JSON NOT NULL, `sort` JSON NULL, `isDefault` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`viewId`), UNIQUE KEY `uq_saved_view_name` (`userId`,`pageKey`,`name`),
  CONSTRAINT `fk_saved_view_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_templates` (
  `templateId` BIGINT NOT NULL AUTO_INCREMENT, `name` VARCHAR(100) NOT NULL, `title` VARCHAR(255) NOT NULL, `description` TEXT NULL,
  `priority` ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal', `defaultAssigneeId` INT NULL,
  `watcherIds` JSON NULL, `checklist` JSON NULL, `visibility` ENUM('private','organization') NOT NULL DEFAULT 'private',
  `createdBy` INT NOT NULL, `isActive` TINYINT(1) NOT NULL DEFAULT 1, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`templateId`),
  KEY `idx_task_template_owner` (`createdBy`,`visibility`,`isActive`),
  CONSTRAINT `fk_task_template_creator` FOREIGN KEY (`createdBy`) REFERENCES `users` (`userId`) ON DELETE RESTRICT,
  CONSTRAINT `fk_task_template_assignee` FOREIGN KEY (`defaultAssigneeId`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_recurrence_rules` (
  `recurrenceRuleId` BIGINT NOT NULL AUTO_INCREMENT, `templateId` BIGINT NOT NULL, `cadence` ENUM('daily','weekly','monthly') NOT NULL,
  `intervalValue` INT NOT NULL DEFAULT 1, `weekdays` JSON NULL, `dayOfMonth` TINYINT NULL, `localTime` TIME NOT NULL,
  `timezone` VARCHAR(60) NOT NULL DEFAULT 'Asia/Bangkok', `startsOn` DATE NOT NULL, `endsOn` DATE NULL, `nextRunAt` DATETIME NOT NULL,
  `lastGeneratedAt` DATETIME NULL, `status` ENUM('active','paused','completed') NOT NULL DEFAULT 'active', `createdBy` INT NOT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`recurrenceRuleId`), KEY `idx_recurrence_due` (`status`,`nextRunAt`),
  CONSTRAINT `fk_recurrence_template` FOREIGN KEY (`templateId`) REFERENCES `task_templates` (`templateId`) ON DELETE CASCADE,
  CONSTRAINT `fk_recurrence_creator` FOREIGN KEY (`createdBy`) REFERENCES `users` (`userId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tasks` (
  `taskId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `assignedTo` INT NULL,
  `createdBy` INT NOT NULL,
  `duplicatedFromTaskId` VARCHAR(36) NULL,
  `templateId` BIGINT NULL,
  `recurrenceRuleId` BIGINT NULL,
  `scheduledFor` DATETIME NULL,
  `occurrenceKey` VARCHAR(180) NULL,
  `blockedReason` VARCHAR(500) NULL,
  `blockedAt` DATETIME NULL,
  `blockedBy` INT NULL,
  `completedBy` INT NULL,
  `approvedBy` INT NULL,
  `priority` ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `version` INT NOT NULL DEFAULT 1,
  `startDate` DATETIME NULL,
  `endDate` DATETIME NULL,
  `dueDate` DATETIME NULL,
  `status` ENUM('draft', 'todo', 'in_progress', 'review', 'done', 'cancelled')
    NOT NULL DEFAULT 'draft',
  `imageUrl` VARCHAR(512) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `deletedAt` DATETIME NULL,
  `completedAt` DATETIME NULL,
  `completionScore` INT NOT NULL DEFAULT 0,
  `reopenedCount` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`taskId`),
  KEY `idx_tasks_assignee_status_due` (`assignedTo`, `status`, `dueDate`),
  KEY `idx_tasks_creator_created` (`createdBy`, `createdAt`),
  KEY `idx_tasks_status_deleted_due` (`status`, `deletedAt`, `dueDate`),
  KEY `idx_tasks_leaderboard` (`status`, `assignedTo`, `completionScore`, `completedAt`),
  UNIQUE KEY `uq_tasks_occurrence_key` (`occurrenceKey`),
  KEY `idx_tasks_duplicate_source` (`duplicatedFromTaskId`),
  KEY `idx_tasks_recurrence` (`recurrenceRuleId`,`scheduledFor`),
  KEY `idx_tasks_active_updated` (`isActive`, `updatedAt`, `taskId`),
  KEY `idx_tasks_assignee_active_status_updated` (`assignedTo`, `isActive`, `status`, `updatedAt`, `taskId`),
  CONSTRAINT `fk_tasks_assignee`
    FOREIGN KEY (`assignedTo`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_creator`
    FOREIGN KEY (`createdBy`) REFERENCES `users` (`userId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_duplicate_source` FOREIGN KEY (`duplicatedFromTaskId`) REFERENCES `tasks` (`taskId`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_template` FOREIGN KEY (`templateId`) REFERENCES `task_templates` (`templateId`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_recurrence` FOREIGN KEY (`recurrenceRuleId`) REFERENCES `task_recurrence_rules` (`recurrenceRuleId`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_blocked_by` FOREIGN KEY (`blockedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_completed_by` FOREIGN KEY (`completedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_approved_by` FOREIGN KEY (`approvedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `chk_tasks_date_range`
    CHECK (`startDate` IS NULL OR `endDate` IS NULL OR `endDate` >= `startDate`),
  CONSTRAINT `chk_tasks_completion_score` CHECK (`completionScore` >= 0),
  CONSTRAINT `chk_tasks_reopened_count` CHECK (`reopenedCount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_checklist_items` (
  `checklistItemId` BIGINT NOT NULL AUTO_INCREMENT, `taskId` VARCHAR(36) NOT NULL, `label` VARCHAR(255) NOT NULL,
  `isRequired` TINYINT(1) NOT NULL DEFAULT 0, `sortOrder` INT NOT NULL DEFAULT 0, `isCompleted` TINYINT(1) NOT NULL DEFAULT 0,
  `completedBy` INT NULL, `completedAt` DATETIME NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`checklistItemId`),
  KEY `idx_task_checklist` (`taskId`,`sortOrder`),
  CONSTRAINT `fk_task_checklist_task` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_checklist_completer` FOREIGN KEY (`completedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_watchers` (
  `taskId` VARCHAR(36) NOT NULL, `userId` INT NOT NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`taskId`,`userId`), KEY `idx_task_watchers_user` (`userId`,`taskId`),
  CONSTRAINT `fk_task_watcher_task` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_watcher_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_activities` (
  `activityId` BIGINT NOT NULL AUTO_INCREMENT, `taskId` VARCHAR(36) NOT NULL, `actorUserId` INT NULL,
  `action` VARCHAR(50) NOT NULL, `metadata` JSON NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`activityId`), KEY `idx_task_activity_task_created` (`taskId`,`createdAt`),
  CONSTRAINT `fk_task_activity_task` FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_activity_actor` FOREIGN KEY (`actorUserId`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_comments` (
  `commentId` INT NOT NULL AUTO_INCREMENT,
  `taskId` VARCHAR(36) NOT NULL,
  `userId` INT NOT NULL,
  `parentCommentId` INT NULL,
  `comment` TEXT NOT NULL,
  `commentImageUrl` VARCHAR(512) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`commentId`),
  KEY `idx_task_comments_task_created` (`taskId`, `createdAt`),
  KEY `idx_task_comments_user_created` (`userId`, `createdAt`),
  KEY `idx_task_comments_parent` (`parentCommentId`),
  CONSTRAINT `fk_task_comments_task`
    FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_task_comments_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_task_comments_parent`
    FOREIGN KEY (`parentCommentId`) REFERENCES `task_comments` (`commentId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_images` (
  `imageId` INT NOT NULL AUTO_INCREMENT,
  `copiedFromImageId` INT NULL,
  `taskId` VARCHAR(36) NOT NULL,
  `imageUrl` VARCHAR(512) NOT NULL,
  `imageOrder` INT NOT NULL DEFAULT 0,
  `uploadedBy` INT NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`imageId`),
  KEY `idx_task_images_task_order` (`taskId`, `imageOrder`),
  KEY `idx_task_images_uploader` (`uploadedBy`),
  UNIQUE KEY `uq_task_images_copy_source` (`taskId`, `copiedFromImageId`),
  CONSTRAINT `fk_task_images_task`
    FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_task_images_uploader`
    FOREIGN KEY (`uploadedBy`) REFERENCES `users` (`userId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_task_images_copy_source`
    FOREIGN KEY (`copiedFromImageId`) REFERENCES `task_images` (`imageId`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_task_images_order` CHECK (`imageOrder` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `task_likes` (
  `likeId` INT NOT NULL AUTO_INCREMENT,
  `taskId` VARCHAR(36) NOT NULL,
  `userId` INT NOT NULL,
  `likeType` ENUM('like', 'love', 'laugh', 'angry', 'wow', 'sad') NOT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`likeId`),
  UNIQUE KEY `uq_task_likes_task_user` (`taskId`, `userId`),
  KEY `idx_task_likes_user_created` (`userId`, `createdAt`),
  CONSTRAINT `fk_task_likes_task`
    FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_task_likes_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `comment_reactions` (
  `reactionId` INT NOT NULL AUTO_INCREMENT,
  `commentId` INT NOT NULL,
  `userId` INT NOT NULL,
  `reactionType` ENUM('like', 'love', 'laugh', 'angry', 'wow', 'sad') NOT NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`reactionId`),
  UNIQUE KEY `uq_comment_reactions_user_type` (`commentId`, `userId`, `reactionType`),
  KEY `idx_comment_reactions_user_created` (`userId`, `createdAt`),
  CONSTRAINT `fk_comment_reactions_comment`
    FOREIGN KEY (`commentId`) REFERENCES `task_comments` (`commentId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comment_reactions_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `refreshToken` VARCHAR(255) NULL,
  `refreshTokenHash` CHAR(64) NULL,
  `userAgent` TEXT NULL,
  `ipAddress` VARCHAR(45) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `revokedAt` TIMESTAMP NULL,
  `expiresAt` DATETIME NOT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_sessions_refresh_token` (`refreshToken`),
  UNIQUE KEY `uq_user_sessions_token_hash` (`refreshTokenHash`),
  KEY `idx_user_sessions_user_active_expires` (`userId`, `isActive`, `expiresAt`),
  KEY `idx_user_sessions_expires` (`expiresAt`),
  CONSTRAINT `fk_user_sessions_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_audit_logs` (
  `logId` BIGINT NOT NULL AUTO_INCREMENT,
  `userId` INT NULL,
  `entityType` VARCHAR(50) NULL,
  `entityId` VARCHAR(100) NULL,
  `action` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `ipAddress` VARCHAR(45) NULL,
  `userAgent` TEXT NULL,
  `details` TEXT NULL,
  `oldValue` TEXT NULL,
  `newValue` TEXT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`logId`),
  KEY `idx_audit_user_created` (`userId`, `createdAt`),
  KEY `idx_audit_entity_created` (`entityType`, `entityId`, `createdAt`),
  KEY `idx_audit_action_created` (`action`, `createdAt`),
  CONSTRAINT `fk_audit_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `notificationId` BIGINT NOT NULL AUTO_INCREMENT,
  `notificationType` VARCHAR(50) NOT NULL,
  `actorUserId` INT NULL,
  `entityType` VARCHAR(50) NULL,
  `entityId` VARCHAR(100) NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `titleKey` VARCHAR(120) NULL,
  `messageKey` VARCHAR(120) NULL,
  `translationParams` JSON NULL,
  `actionUrl` VARCHAR(500) NULL,
  `imageUrl` VARCHAR(512) NULL,
  `isSystem` TINYINT(1) NOT NULL DEFAULT 0,
  `isGlobal` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`notificationId`),
  KEY `idx_notifications_actor_created` (`actorUserId`, `createdAt`),
  KEY `idx_notifications_entity_created` (`entityType`, `entityId`, `createdAt`),
  KEY `idx_notifications_created` (`createdAt`),
  CONSTRAINT `fk_notifications_actor`
    FOREIGN KEY (`actorUserId`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_recipients` (
  `recipientId` INT NOT NULL AUTO_INCREMENT,
  `notificationId` BIGINT NOT NULL,
  `userId` INT NOT NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `readAt` TIMESTAMP NULL,
  `isSeen` TINYINT(1) NOT NULL DEFAULT 0,
  `seenAt` TIMESTAMP NULL,
  `isArchived` TINYINT(1) NOT NULL DEFAULT 0,
  `archivedAt` TIMESTAMP NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` TIMESTAMP NULL,
  `deliveredAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipientId`),
  UNIQUE KEY `uq_notification_recipients_notification_user` (`notificationId`, `userId`),
  KEY `idx_notification_recipients_inbox`
    (`userId`, `isDeleted`, `isArchived`, `isRead`, `deliveredAt`),
  KEY `idx_notification_recipients_cleanup_deleted` (`isDeleted`, `deletedAt`),
  KEY `idx_notification_recipients_cleanup_archive` (`isRead`, `isArchived`, `readAt`),
  CONSTRAINT `fk_notification_recipients_notification`
    FOREIGN KEY (`notificationId`) REFERENCES `notifications` (`notificationId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_recipients_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_group_actors` (
  `groupActorId` INT NOT NULL AUTO_INCREMENT,
  `notificationId` BIGINT NOT NULL,
  `actorUserId` INT NOT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`groupActorId`),
  UNIQUE KEY `uq_notification_group_actor` (`notificationId`, `actorUserId`),
  KEY `idx_notification_group_actor_user` (`actorUserId`),
  CONSTRAINT `fk_notification_group_actor_notification`
    FOREIGN KEY (`notificationId`) REFERENCES `notifications` (`notificationId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_group_actor_user`
    FOREIGN KEY (`actorUserId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_notification_settings` (
  `settingId` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `notifyTaskAssigned` TINYINT(1) NOT NULL DEFAULT 1,
  `notifyTaskComment` TINYINT(1) NOT NULL DEFAULT 1,
  `notifyTaskLike` TINYINT(1) NOT NULL DEFAULT 1,
  `notifyCommentReply` TINYINT(1) NOT NULL DEFAULT 1,
  `notifyCommentReaction` TINYINT(1) NOT NULL DEFAULT 1,
  `notifySystemAlert` TINYINT(1) NOT NULL DEFAULT 1,
  `notifyRoleChanged` TINYINT(1) NOT NULL DEFAULT 1,
  `notifyProfileChanged` TINYINT(1) NOT NULL DEFAULT 1,
  `emailEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `pushEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  `doNotDisturbEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `digestMode` ENUM('none', 'hourly', 'daily', 'weekly') NOT NULL DEFAULT 'none',
  `digestDay` TINYINT NULL,
  `digestTime` VARCHAR(5) NOT NULL DEFAULT '08:00',
  `timezone` VARCHAR(60) NOT NULL DEFAULT 'Asia/Bangkok',
  `lastDigestAt` DATETIME NULL,
  `quietHoursStart` TINYINT NULL DEFAULT 22,
  `quietHoursEnd` TINYINT NULL DEFAULT 7,
  `priorityFilter` ENUM('all', 'high', 'none') NOT NULL DEFAULT 'all',
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`settingId`),
  UNIQUE KEY `uq_user_notification_settings_user` (`userId`),
  CONSTRAINT `fk_user_notification_settings_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_notification_quiet_start`
    CHECK (`quietHoursStart` IS NULL OR `quietHoursStart` BETWEEN 0 AND 23),
  CONSTRAINT `chk_notification_quiet_end`
    CHECK (`quietHoursEnd` IS NULL OR `quietHoursEnd` BETWEEN 0 AND 23)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_preferences` (
  `preferenceId` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `locale` ENUM('en', 'th') NOT NULL DEFAULT 'en',
  `brandTheme` ENUM('purple', 'green') NOT NULL DEFAULT 'purple',
  `colorMode` ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
  `selectedAuraKey` VARCHAR(60) NULL,
  `profileCardMotion` ENUM('full','subtle','off') NOT NULL DEFAULT 'subtle',
  `shareDefaults` JSON NULL,
  `privacyDefaults` JSON NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`preferenceId`),
  UNIQUE KEY `uq_user_preferences_user` (`userId`),
  CONSTRAINT `fk_user_preferences_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_queue` (
  `queueId` INT NOT NULL AUTO_INCREMENT,
  `deduplicationKey` VARCHAR(255) NULL,
  `notificationType` VARCHAR(50) NOT NULL,
  `entityType` VARCHAR(50) NOT NULL,
  `entityId` VARCHAR(100) NOT NULL,
  `recipientUserId` INT NOT NULL,
  `actorUserIds` TEXT NOT NULL COMMENT 'JSON array of user IDs',
  `title` VARCHAR(255) NOT NULL,
  `baseMessage` TEXT NOT NULL,
  `titleKey` VARCHAR(120) NULL,
  `messageKey` VARCHAR(120) NULL,
  `translationParams` JSON NULL,
  `actionUrl` VARCHAR(500) NULL,
  `imageUrl` VARCHAR(512) NULL,
  `isSystem` TINYINT(1) NOT NULL DEFAULT 0,
  `isGlobal` TINYINT(1) NOT NULL DEFAULT 0,
  `groupActorUserIds` TEXT NULL COMMENT 'JSON array of user IDs',
  `status` ENUM('pending','processing','failed','dead') NOT NULL DEFAULT 'pending',
  `attempts` INT NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lockedAt` DATETIME NULL,
  `lockedBy` VARCHAR(100) NULL,
  `lastError` VARCHAR(1000) NULL,
  `deadAt` DATETIME NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`queueId`),
  UNIQUE KEY `uq_notification_queue_deduplication` (`deduplicationKey`),
  KEY `idx_notification_queue_aggregate`
    (`notificationType`, `entityType`, `entityId`, `recipientUserId`),
  KEY `idx_notification_queue_created` (`createdAt`),
  KEY `idx_notification_queue_dispatch` (`status`, `nextAttemptAt`, `queueId`),
  CONSTRAINT `fk_notification_queue_recipient`
    FOREIGN KEY (`recipientUserId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `notification_metrics` (
  `metricId` BIGINT NOT NULL AUTO_INCREMENT,
  `recipientId` INT NOT NULL,
  `userId` INT NOT NULL,
  `notificationId` BIGINT NOT NULL,
  `openedAt` TIMESTAMP NULL,
  `clickedAt` TIMESTAMP NULL,
  `deviceType` VARCHAR(20) NOT NULL DEFAULT 'unknown',
  `browserType` VARCHAR(20) NOT NULL DEFAULT 'unknown',
  `osType` VARCHAR(20) NOT NULL DEFAULT 'unknown',
  `sessionId` VARCHAR(100) NULL,
  `ipHash` VARCHAR(64) NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`metricId`),
  KEY `idx_notification_metrics_recipient` (`recipientId`),
  KEY `idx_notification_metrics_user_created` (`userId`, `createdAt`),
  KEY `idx_notification_metrics_notification_created` (`notificationId`, `createdAt`),
  KEY `idx_notification_metrics_opened` (`openedAt`),
  KEY `idx_notification_metrics_clicked` (`clickedAt`),
  CONSTRAINT `fk_notification_metrics_recipient`
    FOREIGN KEY (`recipientId`) REFERENCES `notification_recipients` (`recipientId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_metrics_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notification_metrics_notification`
    FOREIGN KEY (`notificationId`) REFERENCES `notifications` (`notificationId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `push_subscriptions` (
  `subscriptionId` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `expirationTime` DATETIME NULL,
  `deviceName` VARCHAR(100) NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`subscriptionId`),
  UNIQUE KEY `uq_push_subscriptions_endpoint` (`endpoint`),
  KEY `idx_push_subscriptions_user_active` (`userId`, `isActive`),
  CONSTRAINT `fk_push_subscriptions_user`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_owner` (
  `singletonId` TINYINT NOT NULL DEFAULT 1,
  `userId` INT NOT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`singletonId`), UNIQUE KEY `uq_system_owner_user` (`userId`),
  CONSTRAINT `fk_system_owner_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_system_owner_singleton` CHECK (`singletonId` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_settings` (
  `singletonId` TINYINT NOT NULL DEFAULT 1, `redemptionEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `requestExpiryHours` INT NOT NULL DEFAULT 72, `updatedBy` INT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`singletonId`),
  CONSTRAINT `fk_reward_settings_user` FOREIGN KEY (`updatedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_reward_settings_singleton` CHECK (`singletonId` = 1),
  CONSTRAINT `chk_reward_expiry_hours` CHECK (`requestExpiryHours` BETWEEN 1 AND 720)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_seasons` (
  `seasonId` INT NOT NULL AUTO_INCREMENT, `seasonKey` VARCHAR(7) NOT NULL, `name` VARCHAR(100) NOT NULL,
  `startsAt` DATETIME NOT NULL, `endsAt` DATETIME NOT NULL,
  `status` ENUM('upcoming','active','closed') NOT NULL DEFAULT 'active',
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`seasonId`), UNIQUE KEY `uq_reward_season_key` (`seasonKey`),
  KEY `idx_reward_season_dates` (`startsAt`, `endsAt`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_season_results` (
  `resultId` BIGINT NOT NULL AUTO_INCREMENT, `seasonId` INT NOT NULL, `userId` INT NOT NULL, `rankValue` INT NOT NULL,
  `score` INT NOT NULL, `completedTasks` INT NOT NULL DEFAULT 0, `onTimeTasks` INT NOT NULL DEFAULT 0,
  `firstPassTasks` INT NOT NULL DEFAULT 0, `lastScoredAt` DATETIME NULL, `finalizedAt` DATETIME NOT NULL,
  PRIMARY KEY (`resultId`), UNIQUE KEY `uq_season_result_user` (`seasonId`,`userId`), UNIQUE KEY `uq_season_result_rank` (`seasonId`,`rankValue`),
  CONSTRAINT `fk_season_result_season` FOREIGN KEY (`seasonId`) REFERENCES `reward_seasons` (`seasonId`) ON DELETE CASCADE,
  CONSTRAINT `fk_season_result_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_wallets` (
  `userId` INT NOT NULL, `availablePoints` INT NOT NULL DEFAULT 0, `reservedPoints` INT NOT NULL DEFAULT 0,
  `lifetimeEarned` INT NOT NULL DEFAULT 0,
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`userId`),
  CONSTRAINT `fk_reward_wallet_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_reward_wallet_available` CHECK (`availablePoints` >= 0),
  CONSTRAINT `chk_reward_wallet_reserved` CHECK (`reservedPoints` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_point_ledger` (
  `ledgerId` BIGINT NOT NULL AUTO_INCREMENT, `userId` INT NOT NULL, `seasonId` INT NULL,
  `entryType` ENUM('credit','reserve','release','redeem','adjustment') NOT NULL, `amount` INT NOT NULL,
  `sourceType` VARCHAR(40) NOT NULL, `sourceId` VARCHAR(100) NOT NULL, `idempotencyKey` VARCHAR(180) NOT NULL,
  `metadata` JSON NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`ledgerId`), UNIQUE KEY `uq_reward_ledger_idempotency` (`idempotencyKey`),
  KEY `idx_reward_ledger_user_created` (`userId`, `createdAt`), KEY `idx_reward_ledger_season_user` (`seasonId`, `userId`),
  CONSTRAINT `fk_reward_ledger_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reward_ledger_season` FOREIGN KEY (`seasonId`) REFERENCES `reward_seasons` (`seasonId`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_reward_ledger_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_badges` (
  `badgeId` INT NOT NULL AUTO_INCREMENT, `badgeKey` VARCHAR(60) NOT NULL, `nameKey` VARCHAR(120) NOT NULL,
  `descriptionKey` VARCHAR(120) NOT NULL, `requirementKey` VARCHAR(120) NULL, `icon` VARCHAR(40) NOT NULL,
  `category` VARCHAR(40) NOT NULL DEFAULT 'milestone', `rarity` ENUM('common','rare','epic','legendary') NOT NULL DEFAULT 'common',
  `target` INT NULL, `artworkKey` VARCHAR(60) NOT NULL DEFAULT 'milestone',
  `auraKey` VARCHAR(60) NULL, `rankValue` TINYINT NULL, `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`badgeId`), UNIQUE KEY `uq_reward_badge_key` (`badgeKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_badges` (
  `userBadgeId` BIGINT NOT NULL AUTO_INCREMENT, `userId` INT NOT NULL, `badgeId` INT NOT NULL, `seasonId` INT NULL,
  `sourceId` VARCHAR(100) NOT NULL, `awardedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `isPinned` TINYINT(1) NOT NULL DEFAULT 0, `isPublic` TINYINT(1) NOT NULL DEFAULT 0, `sortOrder` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`userBadgeId`), UNIQUE KEY `uq_user_badge_source` (`userId`, `badgeId`, `sourceId`),
  KEY `idx_user_badges_showcase` (`userId`,`isPinned`,`isPublic`,`sortOrder`),
  CONSTRAINT `fk_user_badge_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_badge_badge` FOREIGN KEY (`badgeId`) REFERENCES `reward_badges` (`badgeId`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_badge_season` FOREIGN KEY (`seasonId`) REFERENCES `reward_seasons` (`seasonId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_templates` (
  `templateId` INT NOT NULL AUTO_INCREMENT, `templateKey` VARCHAR(80) NOT NULL,
  `category` ENUM('quality','on_time','recovery','consistency') NOT NULL,
  `cadence` ENUM('weekly','monthly') NOT NULL, `scope` ENUM('shared','personal') NOT NULL,
  `titleKey` VARCHAR(120) NOT NULL, `descriptionKey` VARCHAR(120) NOT NULL,
  `defaultTarget` INT NOT NULL, `defaultRewardPoints` INT NOT NULL, `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `updatedBy` INT NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`templateId`), UNIQUE KEY `uq_mission_template_key` (`templateKey`),
  CONSTRAINT `fk_mission_template_user` FOREIGN KEY (`updatedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `chk_mission_target` CHECK (`defaultTarget` > 1), CONSTRAINT `chk_mission_reward` CHECK (`defaultRewardPoints` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_instances` (
  `missionId` BIGINT NOT NULL AUTO_INCREMENT, `templateId` INT NOT NULL, `periodKey` VARCHAR(20) NOT NULL,
  `startsAt` DATETIME NOT NULL, `endsAt` DATETIME NOT NULL, `target` INT NOT NULL, `rewardPoints` INT NOT NULL,
  `generatedBy` ENUM('owner','automatic') NOT NULL DEFAULT 'automatic', `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`missionId`), UNIQUE KEY `uq_mission_instance_period` (`templateId`, `periodKey`),
  KEY `idx_mission_instance_active_dates` (`isActive`, `startsAt`, `endsAt`),
  CONSTRAINT `fk_mission_instance_template` FOREIGN KEY (`templateId`) REFERENCES `mission_templates` (`templateId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_mission_progress` (
  `progressId` BIGINT NOT NULL AUTO_INCREMENT, `missionId` BIGINT NOT NULL, `userId` INT NOT NULL,
  `progress` INT NOT NULL DEFAULT 0, `target` INT NOT NULL, `completedAt` DATETIME NULL, `rewardClaimedAt` DATETIME NULL,
  `lastSourceId` VARCHAR(100) NULL, `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`progressId`), UNIQUE KEY `uq_user_mission_progress` (`missionId`, `userId`),
  CONSTRAINT `fk_user_mission_mission` FOREIGN KEY (`missionId`) REFERENCES `mission_instances` (`missionId`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_mission_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `chk_user_mission_progress` CHECK (`progress` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `mission_progress_events` (
  `eventId` BIGINT NOT NULL AUTO_INCREMENT, `missionId` BIGINT NOT NULL, `userId` INT NOT NULL,
  `cadence` ENUM('weekly','monthly') NOT NULL, `periodKey` VARCHAR(20) NOT NULL, `sourceId` VARCHAR(100) NOT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`eventId`),
  UNIQUE KEY `uq_mission_event_cadence_source` (`userId`, `cadence`, `periodKey`, `sourceId`),
  CONSTRAINT `fk_mission_event_mission` FOREIGN KEY (`missionId`) REFERENCES `mission_instances` (`missionId`) ON DELETE CASCADE,
  CONSTRAINT `fk_mission_event_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_catalog_items` (
  `itemId` INT NOT NULL AUTO_INCREMENT, `catalogKey` VARCHAR(80) NULL, `name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) NULL, `imageUrl` VARCHAR(512) NULL, `pointsCost` INT NOT NULL,
  `availableStock` INT NOT NULL DEFAULT 0, `reservedStock` INT NOT NULL DEFAULT 0, `redeemedStock` INT NOT NULL DEFAULT 0,
  `perUserLimit` INT NULL, `startsAt` DATETIME NULL, `endsAt` DATETIME NULL, `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdBy` INT NULL, `updatedBy` INT NULL, `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`itemId`), UNIQUE KEY `uq_reward_catalog_key` (`catalogKey`), KEY `idx_reward_catalog_active` (`isActive`, `startsAt`, `endsAt`),
  CONSTRAINT `fk_reward_catalog_created` FOREIGN KEY (`createdBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `fk_reward_catalog_updated` FOREIGN KEY (`updatedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `chk_reward_catalog_cost` CHECK (`pointsCost` > 0),
  CONSTRAINT `chk_reward_catalog_stock` CHECK (`availableStock` >= 0 AND `reservedStock` >= 0 AND `redeemedStock` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `reward_redemptions` (
  `redemptionId` BIGINT NOT NULL AUTO_INCREMENT, `userId` INT NOT NULL, `itemId` INT NOT NULL,
  `pointsCost` INT NOT NULL, `quantity` INT NOT NULL DEFAULT 1,
  `status` ENUM('pending','approved','rejected','cancelled','expired','fulfilled') NOT NULL DEFAULT 'pending',
  `expiresAt` DATETIME NOT NULL, `decidedBy` INT NULL, `decisionReason` VARCHAR(500) NULL,
  `decidedAt` DATETIME NULL, `fulfilledAt` DATETIME NULL, `idempotencyKey` VARCHAR(180) NOT NULL,
  `createdAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`redemptionId`), UNIQUE KEY `uq_reward_redemption_idempotency` (`idempotencyKey`),
  KEY `idx_reward_redemption_user_status` (`userId`, `status`, `createdAt`), KEY `idx_reward_redemption_status_expiry` (`status`, `expiresAt`),
  CONSTRAINT `fk_reward_redemption_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE RESTRICT,
  CONSTRAINT `fk_reward_redemption_item` FOREIGN KEY (`itemId`) REFERENCES `reward_catalog_items` (`itemId`) ON DELETE RESTRICT,
  CONSTRAINT `fk_reward_redemption_decider` FOREIGN KEY (`decidedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL,
  CONSTRAINT `chk_reward_redemption_cost` CHECK (`pointsCost` > 0), CONSTRAINT `chk_reward_redemption_quantity` CHECK (`quantity` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `public_profiles`
  ADD COLUMN `publishStartAt` DATETIME NULL AFTER `publishedAt`;
ALTER TABLE `public_profiles`
  ADD COLUMN `publishEndAt` DATETIME NULL AFTER `publishStartAt`;

ALTER TABLE `public_profile_events`
  ADD COLUMN `visitorHash` CHAR(64) NULL AFTER `referrer`;
ALTER TABLE `public_profile_events`
  ADD COLUMN `sessionId` VARCHAR(64) NULL AFTER `visitorHash`;
ALTER TABLE `public_profile_events`
  ADD COLUMN `utmSource` VARCHAR(120) NULL AFTER `sessionId`;
ALTER TABLE `public_profile_events`
  ADD COLUMN `utmMedium` VARCHAR(120) NULL AFTER `utmSource`;
ALTER TABLE `public_profile_events`
  ADD COLUMN `utmCampaign` VARCHAR(120) NULL AFTER `utmMedium`;

CREATE TABLE `public_profile_leads` (
  `leadId` VARCHAR(36) NOT NULL, `profileId` VARCHAR(36) NOT NULL, `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(160) NULL, `phone` VARCHAR(32) NULL, `message` VARCHAR(1000) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'new', `consentAt` DATETIME NOT NULL, `consentVersion` VARCHAR(24) NOT NULL DEFAULT '2026-08',
  `assignedTo` INT NULL, `convertedCustomerId` VARCHAR(36) NULL, `convertedAt` DATETIME NULL,
  `visitorHash` CHAR(64) NULL, `ipHash` CHAR(64) NULL, `userAgentHash` CHAR(64) NULL, `deviceType` VARCHAR(20) NOT NULL DEFAULT 'unknown',
  `referrer` VARCHAR(512) NULL, `utmSource` VARCHAR(120) NULL, `utmMedium` VARCHAR(120) NULL, `utmCampaign` VARCHAR(120) NULL,
  `anonymizedAt` DATETIME NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`leadId`), KEY `IDX_profile_leads_profile_status_created` (`profileId`,`status`,`createdAt`), KEY `IDX_profile_leads_retention` (`status`,`createdAt`),
  CONSTRAINT `FK_profile_leads_profile` FOREIGN KEY (`profileId`) REFERENCES `public_profiles` (`profileId`) ON DELETE CASCADE,
  CONSTRAINT `FK_profile_leads_customer` FOREIGN KEY (`convertedCustomerId`) REFERENCES `customers` (`customerId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `public_profile_revisions` (
  `revisionId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `profileId` VARCHAR(36) NOT NULL, `version` INT UNSIGNED NOT NULL,
  `snapshot` JSON NOT NULL, `actorUserId` INT NULL, `reason` VARCHAR(24) NOT NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`revisionId`), UNIQUE KEY `UQ_profile_revision_version` (`profileId`,`version`),
  CONSTRAINT `FK_profile_revisions_profile` FOREIGN KEY (`profileId`) REFERENCES `public_profiles` (`profileId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `public_profile_link_checks` (
  `checkId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `profileId` VARCHAR(36) NOT NULL, `targetKey` VARCHAR(64) NOT NULL,
  `url` VARCHAR(512) NOT NULL, `status` VARCHAR(16) NOT NULL DEFAULT 'unchecked', `httpStatus` SMALLINT UNSIGNED NULL,
  `detail` VARCHAR(255) NULL, `checkedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`checkId`),
  KEY `IDX_profile_link_checks_profile_target` (`profileId`,`targetKey`,`checkedAt`),
  CONSTRAINT `FK_profile_link_checks_profile` FOREIGN KEY (`profileId`) REFERENCES `public_profiles` (`profileId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `public_profile_domains` (
  `domainId` VARCHAR(36) NOT NULL, `profileId` VARCHAR(36) NOT NULL, `hostname` VARCHAR(253) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'pending', `verification` JSON NULL, `isCanonical` TINYINT(1) NOT NULL DEFAULT 0, `redirectToCanonical` TINYINT(1) NOT NULL DEFAULT 1,
  `verifiedAt` DATETIME NULL, `lastCheckedAt` DATETIME NULL, `lastError` VARCHAR(500) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`domainId`), UNIQUE KEY `UQ_profile_domain_hostname` (`hostname`), KEY `IDX_profile_domain_profile` (`profileId`),
  CONSTRAINT `FK_profile_domains_profile` FOREIGN KEY (`profileId`) REFERENCES `public_profiles` (`profileId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_merge_snapshots` (
  `snapshotId` VARCHAR(36) NOT NULL, `sourceCustomerId` VARCHAR(36) NOT NULL, `targetCustomerId` VARCHAR(36) NOT NULL,
  `sourceSnapshot` JSON NOT NULL, `targetSnapshot` JSON NOT NULL, `actorUserId` INT NOT NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`snapshotId`), KEY `IDX_customer_merge_pair` (`sourceCustomerId`,`targetCustomerId`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `registration_requests` (
  `requestId` VARCHAR(36) NOT NULL, `email` VARCHAR(100) NOT NULL, `userName` VARCHAR(50) NOT NULL,
  `userLastName` VARCHAR(50) NOT NULL, `userPhone1` VARCHAR(20) NULL, `passwordHash` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending_email', `verificationTokenHash` CHAR(64) NULL,
  `verificationExpiresAt` DATETIME NULL, `verifiedAt` DATETIME NULL, `reviewedBy` INT NULL, `reviewedAt` DATETIME NULL,
  `reviewReason` VARCHAR(500) NULL, `termsVersion` VARCHAR(24) NOT NULL, `privacyVersion` VARCHAR(24) NOT NULL,
  `consentAt` DATETIME NOT NULL, `ipHash` CHAR(64) NULL, `funnelSessionHash` CHAR(64) NULL, `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`requestId`), UNIQUE KEY `UQ_registration_request_email` (`email`),
  KEY `IDX_registration_status_created` (`status`,`createdAt`),
  CONSTRAINT `FK_registration_reviewed_by` FOREIGN KEY (`reviewedBy`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `privacy_requests` (
  `requestId` VARCHAR(36) NOT NULL, `email` VARCHAR(100) NOT NULL, `requestType` VARCHAR(24) NOT NULL,
  `message` TEXT NULL, `status` VARCHAR(20) NOT NULL DEFAULT 'pending_email', `verificationTokenHash` CHAR(64) NULL,
  `verificationExpiresAt` DATETIME NULL, `verifiedAt` DATETIME NULL, `assignedTo` INT NULL, `resolvedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`requestId`), KEY `IDX_privacy_request_status_created` (`status`,`createdAt`),
  CONSTRAINT `FK_privacy_request_assignee` FOREIGN KEY (`assignedTo`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `consent_records` (
  `consentId` VARCHAR(36) NOT NULL, `userId` INT NULL, `subjectHash` CHAR(64) NULL, `policyVersion` VARCHAR(24) NOT NULL,
  `categories` JSON NOT NULL, `source` VARCHAR(24) NOT NULL, `withdrawnAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`consentId`),
  KEY `IDX_consent_user_created` (`userId`,`createdAt`), KEY `IDX_consent_subject_created` (`subjectHash`,`createdAt`),
  CONSTRAINT `FK_consent_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_capacity_alerts` (
  `alertId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `provider` VARCHAR(24) NOT NULL, `resource` VARCHAR(64) NOT NULL,
  `threshold` TINYINT UNSIGNED NOT NULL, `periodKey` VARCHAR(16) NOT NULL, `measuredPercent` DECIMAL(7,2) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`alertId`),
  UNIQUE KEY `UQ_capacity_alert_period` (`provider`,`resource`,`threshold`,`periodKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_funnel_events` (
  `eventId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `eventType` VARCHAR(32) NOT NULL, `sessionHash` CHAR(64) NOT NULL,
  `userId` INT NULL, `metadata` JSON NULL, `occurredAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`eventId`), KEY `IDX_product_funnel_type_time` (`eventType`,`occurredAt`), KEY `IDX_product_funnel_session_time` (`sessionHash`,`occurredAt`),
  CONSTRAINT `FK_product_funnel_user` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `migrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `timestamp` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_migrations_timestamp_name` (`timestamp`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

INSERT INTO `reward_settings` (`singletonId`, `redemptionEnabled`, `requestExpiryHours`)
VALUES (1, 0, 72);

-- This clean schema already contains the final state of every migration below.
-- Recording the ledger prevents TypeORM from trying to recreate these tables
-- when the backend starts against a freshly restored database.
INSERT INTO `migrations` (`timestamp`, `name`) VALUES
  (1719388800000, 'AddNotificationQueue1719388800000'),
  (1719388900000, 'AddNotificationIndexes1719388900000'),
  (1719389000000, 'AddUserPreferences1719389000000'),
  (1719389100000, 'AddNotificationMetrics1719389100000'),
  (1736764800000, 'AddPushSubscription1736764800000'),
  (1770104312494, 'InitialSchema1770104312494'),
  (1785000000000, 'AddNotificationRecipientColumns1785000000000'),
  (1790000000000, 'RepairSchemaDrift1790000000000'),
  (1791000000000, 'CreatePublicProfiles1791000000000'),
  (1792000000000, 'RepairUserIdentity1792000000000'),
  (1793000000000, 'AddVerifiedTaskScoring1793000000000'),
  (1794000000000, 'OptimizeNotificationInbox1794000000000'),
  (1795000000000, 'AddUserPreferences1795000000000'),
  (1796000000000, 'AddNotificationTranslations1796000000000'),
  (1797000000000, 'AddProfileChangedNotificationPreference1797000000000'),
  (1798000000000, 'OwnerOrganizationRewards1798000000000'),
  (1799000000000, 'TeamsAndTaskHardening1799000000000'),
  (1800000000000, 'SingleOrganizationOwnership1800000000000'),
  (1810000000000, 'ProductivityEngagementFoundation1810000000000'),
  (1820000000000, 'OptimizeWorkLists1820000000000'),
  (1830000000000, 'ReliableDeliveryWorkers1830000000000'),
  (1840000000000, 'UserProfilesAndAchievements1840000000000'),
  (1850000000000, 'ProfileConversionPlatform1850000000000'),
  (1851000000000, 'ProfileTrustCampaign1851000000000'),
  (1852000000000, 'ProfileCustomDomains1852000000000'),
  (1853000000000, 'ProfileDomainRedirectPreference1853000000000'),
  (1854000000000, 'UatAccessPrivacyCapacity1854000000000');

INSERT INTO `roles` (`roleName`, `description`, `roleLevel`) VALUES
  ('Owner', 'System owner with full access and ownership transfer authority', 999),
  ('Admin', 'Manage users and content', 100),
  ('Moderator', 'Moderate content and users', 50),
  ('Member', 'Organization member', 1);

INSERT INTO `permissions` (`permissionName`, `description`) VALUES
  ('SYSTEM_ADMIN', 'Full system administration'),
  ('VIEW_USERS', 'View users'),
  ('CREATE_USERS', 'Create users'),
  ('UPDATE_USERS', 'Update users'),
  ('DELETE_USERS', 'Delete users'),
  ('MANAGE_ROLES', 'Manage roles and permissions'),
  ('VIEW_CUSTOMERS', 'View customers'),
  ('MANAGE_CUSTOMERS', 'Manage customers'),
  ('VIEW_TASKS', 'View tasks'),
  ('MANAGE_TASKS', 'Manage tasks'),
  ('PUBLISH_PROFILES', 'Publish, unpublish and delete organization profiles'),
  ('MANAGE_REWARDS', 'Manage reward settings, catalog, missions and redemptions'),
  ('VIEW_NOTIFICATION_ANALYTICS', 'View organization notification analytics'),
  ('MANAGE_NOTIFICATION_SYSTEM', 'Manage notification delivery and retention'),
  ('VIEW_ORGANIZATION_ANALYTICS', 'View organization-wide analytics');


INSERT INTO `role_permissions` (`roleId`, `permissionId`)
SELECT r.`roleId`, p.`permissionId`
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.`roleName` = 'Owner'
   OR (r.`roleName` = 'Admin' AND p.`permissionName` IN (
     'VIEW_USERS', 'CREATE_USERS', 'UPDATE_USERS',
     'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS', 'VIEW_TASKS', 'MANAGE_TASKS', 'PUBLISH_PROFILES',
     'VIEW_NOTIFICATION_ANALYTICS'
   ))
   OR (r.`roleName` = 'Moderator' AND p.`permissionName` IN (
     'VIEW_USERS', 'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS', 'VIEW_TASKS'
   ))
   OR (r.`roleName` = 'Member' AND p.`permissionName` = 'VIEW_TASKS');

COMMIT;

-- Intentionally no default user/password is inserted.
-- Intentionally no Owner is seeded. Bootstrap/transfer ownership with the audited CLI:
-- npm --prefix Backend run owner:transfer -- --email user@example.com
