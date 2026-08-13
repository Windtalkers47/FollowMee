import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfilesAndAchievements1840000000000 implements MigrationInterface {
  name = 'UserProfilesAndAchievements1840000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('reward_badges', 'category'))) await queryRunner.query("ALTER TABLE reward_badges ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT 'milestone'");
    if (!(await queryRunner.hasColumn('reward_badges', 'rarity'))) await queryRunner.query("ALTER TABLE reward_badges ADD COLUMN rarity ENUM('common','rare','epic','legendary') NOT NULL DEFAULT 'common'");
    if (!(await queryRunner.hasColumn('reward_badges', 'target'))) await queryRunner.query('ALTER TABLE reward_badges ADD COLUMN target INT NULL');
    if (!(await queryRunner.hasColumn('reward_badges', 'artworkKey'))) await queryRunner.query("ALTER TABLE reward_badges ADD COLUMN artworkKey VARCHAR(60) NOT NULL DEFAULT 'milestone'");
    if (!(await queryRunner.hasColumn('reward_badges', 'requirementKey'))) await queryRunner.query('ALTER TABLE reward_badges ADD COLUMN requirementKey VARCHAR(120) NULL');
    if (!(await queryRunner.hasColumn('user_badges', 'isPinned'))) await queryRunner.query('ALTER TABLE user_badges ADD COLUMN isPinned TINYINT(1) NOT NULL DEFAULT 0');
    if (!(await queryRunner.hasColumn('user_badges', 'isPublic'))) await queryRunner.query('ALTER TABLE user_badges ADD COLUMN isPublic TINYINT(1) NOT NULL DEFAULT 0');
    if (!(await queryRunner.hasColumn('user_badges', 'sortOrder'))) await queryRunner.query('ALTER TABLE user_badges ADD COLUMN sortOrder INT NOT NULL DEFAULT 0');
    await queryRunner.query('CREATE INDEX idx_user_badges_showcase ON user_badges (userId, isPinned, isPublic, sortOrder)');
    await queryRunner.query(`CREATE TABLE user_profiles (
      userProfileId BIGINT NOT NULL AUTO_INCREMENT, userId INT NOT NULL, handle VARCHAR(32) NOT NULL,
      headline VARCHAR(140) NULL, bio VARCHAR(500) NULL, themeConfig JSON NULL,
      visibility ENUM('public','unlisted','private') NOT NULL DEFAULT 'private',
      status ENUM('draft','published') NOT NULL DEFAULT 'draft', publishedAt DATETIME NULL,
      createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (userProfileId), UNIQUE KEY uq_user_profiles_user (userId), UNIQUE KEY uq_user_profiles_handle (handle),
      KEY idx_user_profiles_public (handle, status, visibility),
      CONSTRAINT fk_user_profiles_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`UPDATE reward_badges SET
      category = CASE badgeKey WHEN 'on-time-star' THEN 'on_time' WHEN 'first-pass-quality' THEN 'quality' WHEN 'consistency' THEN 'consistency' WHEN 'comeback' THEN 'recovery' ELSE 'season' END,
      rarity = CASE WHEN rankValue = 1 THEN 'legendary' WHEN rankValue IN (2,3) THEN 'epic' WHEN badgeKey IN ('consistency','comeback') THEN 'rare' ELSE 'common' END,
      artworkKey = badgeKey, requirementKey = descriptionKey`);
    await queryRunner.query(`INSERT INTO reward_badges (badgeKey,nameKey,descriptionKey,requirementKey,icon,category,rarity,target,artworkKey) VALUES
      ('first-completion','rewards.badge.firstCompletion','rewards.badge.firstCompletionDescription','rewards.badge.firstCompletionDescription','task_alt','milestone','common',1,'first-completion'),
      ('mission-complete','rewards.badge.missionComplete','rewards.badge.missionCompleteDescription','rewards.badge.missionCompleteDescription','stars','mission','rare',1,'mission-complete')
      ON DUPLICATE KEY UPDATE requirementKey=VALUES(requirementKey),artworkKey=VALUES(artworkKey),target=VALUES(target)`);
    await queryRunner.query("UPDATE reward_badges SET target=CASE badgeKey WHEN 'on-time-star' THEN 3 WHEN 'first-pass-quality' THEN 3 WHEN 'consistency' THEN 5 WHEN 'comeback' THEN 1 ELSE target END WHERE badgeKey IN ('on-time-star','first-pass-quality','consistency','comeback')");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS user_profiles');
    await queryRunner.query('DROP INDEX idx_user_badges_showcase ON user_badges');
    for (const column of ['sortOrder','isPublic','isPinned']) if (await queryRunner.hasColumn('user_badges', column)) await queryRunner.query(`ALTER TABLE user_badges DROP COLUMN ${column}`);
    for (const column of ['requirementKey','artworkKey','target','rarity','category']) if (await queryRunner.hasColumn('reward_badges', column)) await queryRunner.query(`ALTER TABLE reward_badges DROP COLUMN ${column}`);
  }
}
