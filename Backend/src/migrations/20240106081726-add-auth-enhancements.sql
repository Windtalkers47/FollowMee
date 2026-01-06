-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_isActive ON users(isActive);
CREATE INDEX IF NOT EXISTS idx_users_userRole ON users(userRole);

-- Create user_audit_logs table
CREATE TABLE IF NOT EXISTS user_audit_logs (
  logId INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'e.g., LOGIN, PASSWORD_CHANGE, PROFILE_UPDATE',
  ipAddress VARCHAR(45),
  userAgent TEXT,
  status VARCHAR(20) NOT NULL COMMENT 'SUCCESS, FAILURE',
  details TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
  INDEX idx_audit_userId (userId),
  INDEX idx_audit_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Create user_sessions table for refresh tokens
CREATE TABLE IF NOT EXISTS user_sessions (
  sessionId VARCHAR(255) PRIMARY KEY,
  userId INT NOT NULL,
  refreshToken VARCHAR(255) NOT NULL,
  userAgent TEXT,
  ipAddress VARCHAR(45),
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  isRevoked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
  INDEX idx_user_sessions_userId (userId),
  INDEX idx_user_sessions_token (refreshToken),
  INDEX idx_user_sessions_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- Add login attempt tracking to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS loginAttempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lastLoginAttempt TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS lockedUntil TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS lastLogin TIMESTAMP NULL,
ADD INDEX IF NOT EXISTS idx_users_locked (lockedUntil);

-- Add a comment about password hashing (implementation is in your auth service)
-- Note: Ensure passwords are hashed using bcrypt or Argon2 in your auth service
