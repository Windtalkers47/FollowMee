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
      settings = this.create({
        userId,
        notifyTaskAssigned: true,
        notifyTaskComment: true,
        notifyTaskLike: true,
        notifyCommentReply: true,
        notifyCommentReaction: true,
        notifySystemAlert: true,
        emailEnabled: false,
        pushEnabled: true,
      });
      await this.save(settings);
    }
    
    return settings;
  }

  async updateSettings(userId: number, updates: Partial<UserNotificationSettings>): Promise<UserNotificationSettings | null> {
    const settings = await this.findByUserId(userId);
    if (!settings) return null;

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
      case 'SYSTEM_ALERT':
        return settings.notifySystemAlert;
      case 'ROLE_CHANGED':
        return settings.notifyRoleChanged;
      default:
        return true;
    }
  }
}