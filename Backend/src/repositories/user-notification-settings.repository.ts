import { Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { UserNotificationSettings } from '../entities/UserNotificationSettings';

export class UserNotificationSettingsRepository extends BaseRepository<UserNotificationSettings> {
  constructor() {
    super(UserNotificationSettings);
  }

  async findByUserId(userId: number): Promise<UserNotificationSettings | null> {
    return this.repository.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async getOrCreateForUser(userId: number): Promise<UserNotificationSettings> {
    let settings = await this.findByUserId(userId);
    
    if (!settings) {
      await this.repository.query(
        'INSERT IGNORE INTO user_notification_settings (userId) VALUES (?)',
        [userId],
      );
      settings = await this.findByUserId(userId);
    }

    if (!settings) throw new Error(`Unable to initialize notification settings for user ${userId}`);
    return settings;
  }

  async updateSettings(userId: number, updates: Partial<UserNotificationSettings>): Promise<UserNotificationSettings | null> {
    const settings = await this.getOrCreateForUser(userId);

    Object.assign(settings, updates);
    return this.save(settings);
  }

  async checkNotificationPreference(userId: number, notificationType: string): Promise<boolean> {
    const settings = await this.findByUserId(userId);
    if (!settings) return true; // Default to enabled if no settings exist

    switch (notificationType) {
      case 'TASK_ASSIGNED':
        return settings.notifyTaskAssigned;
      case 'TASK_COMMENT':
        return settings.notifyTaskComment;
      case 'TASK_LIKE':
        return settings.notifyTaskLike;
      case 'COMMENT_REPLY':
        return settings.notifyCommentReply;
      case 'COMMENT_REACTION':
        return settings.notifyCommentReaction;
      case 'MENTION':
        return settings.notifyCommentReply;
      case 'SYSTEM_ALERT':
        return settings.notifySystemAlert;
      case 'ROLE_CHANGED':
        return settings.notifyRoleChanged;
      case 'PROFILE_UPDATED_BY_ADMIN':
        return settings.notifyProfileChanged;
      default:
        return true;
    }
  }
}
