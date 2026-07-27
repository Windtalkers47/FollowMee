-- FollowMee clean schema
-- Schema version: 2026-07-26 / Public Profile major update
-- MySQL 8.0+ / MariaDB 10.6+
--
-- WARNING: This script drops every FollowMee table and all data in it.
-- Export the current database before running this file.

CREATE DATABASE IF NOT EXISTS `followmee`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `followmee`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `notification_metrics`;
DROP TABLE IF EXISTS `notification_group_actors`;
DROP TABLE IF EXISTS `notification_recipients`;
DROP TABLE IF EXISTS `notification_queue`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `push_subscriptions`;
DROP TABLE IF EXISTS `user_notification_settings`;
DROP TABLE IF EXISTS `comment_reactions`;
DROP TABLE IF EXISTS `task_likes`;
DROP TABLE IF EXISTS `task_images`;
DROP TABLE IF EXISTS `task_comments`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `user_roles`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `roles`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `user_audit_logs`;
DROP TABLE IF EXISTS `public_profile_events`;
DROP TABLE IF EXISTS `public_profile_links`;
DROP TABLE IF EXISTS `public_profiles`;
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

CREATE TABLE `customers` (
  `customerId` VARCHAR(36) NOT NULL,
  `userId` INT NULL,
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
  `status` ENUM('active', 'inactive', 'canceled') NOT NULL DEFAULT 'active',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`customerId`),
  UNIQUE KEY `uq_customers_email` (`customerEmail`),
  KEY `idx_customers_owner` (`userId`),
  KEY `idx_customers_status_deleted` (`status`, `deletedAt`),
  KEY `idx_customers_name` (`customerName`, `customerLastName`),
  CONSTRAINT `fk_customers_owner`
    FOREIGN KEY (`userId`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customer is private CRM data. Public profiles are an explicit publishing
-- layer with independent lifecycle, privacy controls and analytics.
CREATE TABLE `public_profiles` (
  `profileId` VARCHAR(36) NOT NULL,
  `userId` INT NOT NULL,
  `customerId` VARCHAR(36) NULL,
  `slug` VARCHAR(64) NOT NULL,
  `displayName` VARCHAR(100) NOT NULL,
  `headline` VARCHAR(140) NULL,
  `bio` VARCHAR(500) NULL,
  `avatarUrl` VARCHAR(512) NULL,
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

CREATE TABLE `tasks` (
  `taskId` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `assignedTo` INT NULL,
  `createdBy` INT NOT NULL,
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
  CONSTRAINT `fk_tasks_assignee`
    FOREIGN KEY (`assignedTo`) REFERENCES `users` (`userId`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_tasks_creator`
    FOREIGN KEY (`createdBy`) REFERENCES `users` (`userId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_tasks_date_range`
    CHECK (`startDate` IS NULL OR `endDate` IS NULL OR `endDate` >= `startDate`),
  CONSTRAINT `chk_tasks_completion_score` CHECK (`completionScore` >= 0),
  CONSTRAINT `chk_tasks_reopened_count` CHECK (`reopenedCount` >= 0)
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
  CONSTRAINT `fk_task_images_task`
    FOREIGN KEY (`taskId`) REFERENCES `tasks` (`taskId`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_task_images_uploader`
    FOREIGN KEY (`uploadedBy`) REFERENCES `users` (`userId`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
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
  `refreshToken` VARCHAR(255) NOT NULL,
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
  `emailEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `pushEnabled` TINYINT(1) NOT NULL DEFAULT 1,
  `doNotDisturbEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `digestMode` ENUM('none', 'hourly', 'daily') NOT NULL DEFAULT 'none',
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

CREATE TABLE `notification_queue` (
  `queueId` INT NOT NULL AUTO_INCREMENT,
  `notificationType` VARCHAR(50) NOT NULL,
  `entityType` VARCHAR(50) NOT NULL,
  `entityId` VARCHAR(100) NOT NULL,
  `recipientUserId` INT NOT NULL,
  `actorUserIds` TEXT NOT NULL COMMENT 'JSON array of user IDs',
  `title` VARCHAR(255) NOT NULL,
  `baseMessage` TEXT NOT NULL,
  `actionUrl` VARCHAR(500) NULL,
  `imageUrl` VARCHAR(512) NULL,
  `isSystem` TINYINT(1) NOT NULL DEFAULT 0,
  `isGlobal` TINYINT(1) NOT NULL DEFAULT 0,
  `groupActorUserIds` TEXT NULL COMMENT 'JSON array of user IDs',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`queueId`),
  KEY `idx_notification_queue_aggregate`
    (`notificationType`, `entityType`, `entityId`, `recipientUserId`),
  KEY `idx_notification_queue_created` (`createdAt`),
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

CREATE TABLE `migrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `timestamp` BIGINT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_migrations_timestamp_name` (`timestamp`, `name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

START TRANSACTION;

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
  (1794000000000, 'OptimizeNotificationInbox1794000000000');

INSERT INTO `roles` (`roleName`, `description`, `roleLevel`) VALUES
  ('Superadmin', 'Full system access', 999),
  ('Admin', 'Manage users and content', 100),
  ('Moderator', 'Moderate content and users', 50),
  ('Customer', 'Regular user', 1);

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
  ('MANAGE_TASKS', 'Manage tasks');

INSERT INTO `role_permissions` (`roleId`, `permissionId`)
SELECT r.`roleId`, p.`permissionId`
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.`roleName` = 'Superadmin'
   OR (r.`roleName` = 'Admin' AND p.`permissionName` IN (
     'VIEW_USERS', 'CREATE_USERS', 'UPDATE_USERS',
     'VIEW_CUSTOMERS', 'MANAGE_CUSTOMERS', 'VIEW_TASKS', 'MANAGE_TASKS'
   ))
   OR (r.`roleName` = 'Moderator' AND p.`permissionName` IN (
     'VIEW_USERS', 'VIEW_CUSTOMERS', 'VIEW_TASKS'
   ))
   OR (r.`roleName` = 'Customer' AND p.`permissionName` = 'VIEW_TASKS');

COMMIT;

-- Intentionally no default user/password is inserted.
-- Register the first account through the app, then grant Superadmin:
--
-- INSERT INTO user_roles (userId, roleId)
-- SELECT u.userId, r.roleId
-- FROM users u
-- JOIN roles r ON r.roleName = 'Superadmin'
-- WHERE u.userEmail = 'replace-with-your-email@example.com';
