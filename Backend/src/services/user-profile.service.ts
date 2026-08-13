import AppDataSource from '../config/database';
import { ApplicationError } from '../errors/application.error';

export type UserProfileVisibility = 'public' | 'unlisted' | 'private';
export interface UserProfileInput { handle?: string; headline?: string | null; bio?: string | null; themeConfig?: Record<string, unknown> | null; visibility?: UserProfileVisibility }
const reservedHandles = new Set(['admin','api','app','auth','customer','customers','dashboard','followmee','help','login','profile','rewards','settings','support','tasks','users']);
export const normalizeUserProfileHandle = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
export const validateUserProfileHandle = (value: string) => {
  const handle = normalizeUserProfileHandle(value);
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(handle) || reservedHandles.has(handle)) throw new ApplicationError('Handle must be 3-32 letters, numbers, or hyphens', 'USER_PROFILE_HANDLE_INVALID', 400);
  return handle;
};

export class UserProfileService {
  private async suggestion(userId: number) {
    const user = (await AppDataSource.query('SELECT userName, userLastName FROM users WHERE userId = ? LIMIT 1', [userId]))[0];
    const base = normalizeUserProfileHandle(`${user?.userName || 'member'}-${user?.userLastName || ''}`).slice(0, 27).replace(/-$/, '') || 'member';
    for (let suffix = 0; suffix < 100; suffix++) {
      const candidate = suffix ? `${base}-${suffix + 1}` : base;
      if (!reservedHandles.has(candidate) && !(await AppDataSource.query('SELECT 1 FROM user_profiles WHERE handle = ? LIMIT 1', [candidate]))[0]) return candidate;
    }
    return `member-${userId}`;
  }
  private normalizeInput(input: UserProfileInput) {
    const visibility = input.visibility && ['public','unlisted','private'].includes(input.visibility) ? input.visibility : 'private';
    return { headline: input.headline?.trim().slice(0, 140) || null, bio: input.bio?.trim().slice(0, 500) || null, themeConfig: input.themeConfig ? JSON.stringify(input.themeConfig) : null, visibility };
  }
  async getMine(userId: number) {
    const profile = (await AppDataSource.query('SELECT up.*, u.userName, u.userLastName, u.userImageUrl FROM user_profiles up INNER JOIN users u ON u.userId = up.userId WHERE up.userId = ? LIMIT 1', [userId]))[0];
    return profile ? { ...profile, themeConfig: typeof profile.themeConfig === 'string' ? JSON.parse(profile.themeConfig) : profile.themeConfig, achievements: await this.ownerAchievements(userId) } : { profile: null, suggestedHandle: await this.suggestion(userId) };
  }
  async save(userId: number, input: UserProfileInput) {
    const handle = validateUserProfileHandle(input.handle || await this.suggestion(userId));
    const conflict = (await AppDataSource.query('SELECT userId FROM user_profiles WHERE handle = ? AND userId <> ? LIMIT 1', [handle, userId]))[0];
    if (conflict) throw new ApplicationError('This handle is already in use', 'USER_PROFILE_HANDLE_CONFLICT', 409);
    const value = this.normalizeInput(input);
    await AppDataSource.query(`INSERT INTO user_profiles (userId,handle,headline,bio,themeConfig,visibility) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE handle=VALUES(handle),headline=VALUES(headline),bio=VALUES(bio),themeConfig=VALUES(themeConfig),visibility=VALUES(visibility)`, [userId, handle, value.headline, value.bio, value.themeConfig, value.visibility]);
    return this.getMine(userId);
  }
  async publish(userId: number) {
    const result = await AppDataSource.query("UPDATE user_profiles SET status='published', publishedAt=COALESCE(publishedAt,NOW()) WHERE userId = ?", [userId]);
    if (!Number(result.affectedRows || 0)) throw new ApplicationError('Create your profile before publishing', 'USER_PROFILE_NOT_FOUND', 404);
    return this.getMine(userId);
  }
  async unpublish(userId: number) { await AppDataSource.query("UPDATE user_profiles SET status='draft', publishedAt=NULL WHERE userId = ?", [userId]); return this.getMine(userId); }
  private ownerAchievements(userId: number) { return AppDataSource.query(`SELECT rb.badgeKey,rb.nameKey,rb.descriptionKey,rb.requirementKey,rb.artworkKey,rb.category,rb.rarity,rb.target,ub.userBadgeId,ub.awardedAt,ub.isPinned,ub.isPublic,ub.sortOrder FROM reward_badges rb INNER JOIN user_badges ub ON ub.userBadgeId=(SELECT ub2.userBadgeId FROM user_badges ub2 WHERE ub2.userId=? AND ub2.badgeId=rb.badgeId ORDER BY ub2.awardedAt DESC,ub2.userBadgeId DESC LIMIT 1) WHERE rb.isActive=1 ORDER BY ub.sortOrder,ub.awardedAt DESC`, [userId]); }
  async getPublic(handleInput: string) {
    const handle = validateUserProfileHandle(handleInput);
    const rows = await AppDataSource.query(`SELECT up.userId,up.handle,up.headline,up.bio,up.themeConfig,up.visibility,up.publishedAt,u.userName,u.userLastName,u.userImageUrl,rb.badgeKey,rb.nameKey,rb.descriptionKey,rb.requirementKey,rb.artworkKey,rb.category,rb.rarity,rb.target,ub.userBadgeId,ub.awardedAt,ub.sortOrder FROM user_profiles up INNER JOIN users u ON u.userId=up.userId LEFT JOIN user_badges ub ON ub.userId=up.userId AND ub.isPinned=1 AND ub.isPublic=1 AND ub.userBadgeId=(SELECT ub2.userBadgeId FROM user_badges ub2 WHERE ub2.userId=up.userId AND ub2.badgeId=ub.badgeId AND ub2.isPinned=1 AND ub2.isPublic=1 ORDER BY ub2.awardedAt DESC,ub2.userBadgeId DESC LIMIT 1) LEFT JOIN reward_badges rb ON rb.badgeId=ub.badgeId AND rb.isActive=1 WHERE up.handle=? AND up.status='published' AND up.visibility IN ('public','unlisted') AND u.isActive=1 ORDER BY ub.sortOrder,ub.awardedAt DESC`, [handle]);
    if (!rows[0]) throw new ApplicationError('Profile not found', 'USER_PROFILE_NOT_FOUND', 404);
    const first = rows[0];
    return { handle:first.handle, displayName:`${first.userName} ${first.userLastName}`.trim(), avatarUrl:first.userImageUrl || null, headline:first.headline, bio:first.bio, themeConfig:typeof first.themeConfig === 'string' ? JSON.parse(first.themeConfig) : first.themeConfig, visibility:first.visibility, publishedAt:first.publishedAt, achievements:rows.filter(row=>row.badgeKey).map(row=>{const target=Number(row.target||1);return { badgeKey:row.badgeKey,nameKey:row.nameKey,descriptionKey:row.descriptionKey,requirementKey:row.requirementKey||row.descriptionKey,artworkKey:row.artworkKey,category:row.category,rarity:row.rarity,target,progress:target,progressPercent:100,unlocked:true,userBadgeId:Number(row.userBadgeId),awardedAt:row.awardedAt,isPinned:true,isPublic:true,sortOrder:Number(row.sortOrder||0) };}) };
  }
}
export const userProfileService = new UserProfileService();
