import { logger } from '../utils/logger';
import { profileLeadService } from './profile-lead.service';

class ProfileLeadRetentionService {
  private timer: NodeJS.Timeout | null = null;

  start() {
    if (this.timer || process.env.NODE_ENV === 'test') return;
    const run = async () => {
      try {
        const count = await profileLeadService.anonymizeExpired();
        if (count) logger.info(`Anonymized ${count} expired public profile leads`);
      } catch (error) {
        logger.error('Public profile lead retention worker failed', error instanceof Error ? error : new Error(String(error)));
      }
    };
    this.timer = setInterval(() => void run(), 24 * 60 * 60_000);
    this.timer.unref();
    void run();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const profileLeadRetentionService = new ProfileLeadRetentionService();
