-- Add login attempt tracking and lockout fields to users table
ALTER TABLE `users`
ADD COLUMN `login_attempts` INT NOT NULL DEFAULT 0,
ADD COLUMN `last_login_attempt` DATETIME NULL,
ADD COLUMN `locked_until` DATETIME NULL,
ADD COLUMN `last_login` DATETIME NULL,
ADD INDEX `idx_users_locked_until` (`locked_until`);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `refresh_token` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `revoked_at` DATETIME NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `refresh_token_UNIQUE` (`refresh_token` ASC) VISIBLE,
  INDEX `idx_user_sessions_user_id` (`user_id` ASC) VISIBLE,
  INDEX `idx_user_sessions_expires_at` (`expires_at` ASC) VISIBLE,
  INDEX `idx_user_sessions_is_active` (`is_active` ASC) VISIBLE,
  CONSTRAINT `fk_user_sessions_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



-------------------------



-- Add missing columns to user_sessions table
ALTER TABLE `user_sessions` 
ADD COLUMN IF NOT EXISTS `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `isRevoked`,
ADD COLUMN IF NOT EXISTS `revoked_at` TIMESTAMP NULL AFTER `is_active`,
ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`;

-- Rename isRevoked to is_active if needed (MySQL doesn't support DROP COLUMN IF EXISTS in all versions)
SET @dbname = DATABASE();
SET @tablename = "user_sessions";
SET @columnname = "isRevoked";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (column_name = @columnname)
  ) > 0,
  "ALTER TABLE user_sessions DROP COLUMN isRevoked",
  "SELECT 1"
));
PREPARE alterIfExists FROM @preparedStatement;
EXECUTE alterIfExists;
DEALLOCATE PREPARE alterIfExists;

-- Add any missing indexes
CREATE INDEX IF NOT EXISTS `idx_user_sessions_is_active` ON `user_sessions` (`is_active`);