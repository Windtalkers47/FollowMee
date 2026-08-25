import AppDataSource from '../config/database';
import { SystemCapacityAlert } from '../entities/SystemCapacityAlert';
import { User } from '../entities/User';
import { emailService } from './email.service';
import { NotificationHelper } from '../utils/notification.util';

export interface CapacityMetric { resource: string; used: number | null; limit: number | null; unit: string; percent: number | null; exact: boolean; source: 'runtime' | 'database' | 'provider-dashboard'; }
export interface CapacityProvider { provider: 'application' | 'tidb' | 'render' | 'vercel' | 'email'; status: 'healthy' | 'warning' | 'critical' | 'unknown'; dashboardUrl?: string; metrics: CapacityMetric[]; note?: string; }
const percent = (used: number | null, limit: number | null) => used == null || !limit ? null : Math.round((used / limit) * 10_000) / 100;
const statusFor = (metrics: CapacityMetric[]): CapacityProvider['status'] => {
  const maximum = Math.max(0, ...metrics.map(metric => metric.percent ?? 0));
  return maximum >= 95 ? 'critical' : maximum >= 70 ? 'warning' : 'healthy';
};
export const resolveCapacityThreshold = (value: number | null, exact: boolean): number | null => {
  if (!exact || value == null) return null;
  return [100, 95, 85, 70].find(threshold => value >= threshold) ?? null;
};

class SystemCapacityService {
  private timer: NodeJS.Timeout | null = null;

  async snapshot(): Promise<{ checkedAt: string; providers: CapacityProvider[] }> {
    const memory = process.memoryUsage();
    const email = emailService.getEmailUsage();
    let databaseMetrics: CapacityMetric[] = [];
    let databaseStatus: CapacityProvider['status'] = 'unknown';
    try {
      const [sizeRows, connectionRows, maxRows] = await Promise.all([
        AppDataSource.query('SELECT COALESCE(SUM(data_length + index_length), 0) AS bytes FROM information_schema.tables WHERE table_schema = DATABASE()'),
        AppDataSource.query("SHOW STATUS LIKE 'Threads_connected'"),
        AppDataSource.query("SHOW VARIABLES LIKE 'max_connections'"),
      ]);
      const bytes = Number(sizeRows[0]?.bytes || 0);
      const storageLimit = Number(process.env.TIDB_STORAGE_LIMIT_BYTES || 0) || null;
      const storageUsageConfirmed = process.env.TIDB_STORAGE_USAGE_CONFIRMED === 'true';
      const connections = Number(connectionRows[0]?.Value || 0);
      const connectionLimit = Number(maxRows[0]?.Value || 0) || null;
      databaseMetrics = [
        { resource: 'storage', used: bytes, limit: storageLimit, unit: 'bytes', percent: storageUsageConfirmed ? percent(bytes, storageLimit) : null, exact: storageUsageConfirmed && Boolean(storageLimit), source: 'database' },
        { resource: 'connections', used: connections, limit: connectionLimit, unit: 'connections', percent: percent(connections, connectionLimit), exact: Boolean(connectionLimit), source: 'database' },
        { resource: 'request-units', used: null, limit: null, unit: 'RU', percent: null, exact: false, source: 'provider-dashboard' },
      ];
      databaseStatus = statusFor(databaseMetrics);
    } catch { databaseMetrics = [{ resource: 'connectivity', used: 0, limit: 1, unit: 'boolean', percent: 100, exact: true, source: 'database' }]; databaseStatus = 'critical'; }
    const applicationMetrics: CapacityMetric[] = [
      { resource: 'uptime', used: Math.floor(process.uptime()), limit: null, unit: 'seconds', percent: null, exact: true, source: 'runtime' },
      { resource: 'heap', used: memory.heapUsed, limit: null, unit: 'bytes', percent: null, exact: true, source: 'runtime' },
    ];
    const emailMetrics: CapacityMetric[] = [{ resource: 'daily-email', used: email.sent, limit: email.limit, unit: 'messages', percent: percent(email.sent, email.limit), exact: true, source: 'runtime' }];
    const providers: CapacityProvider[] = [
      { provider: 'application', status: statusFor(applicationMetrics), metrics: applicationMetrics },
      { provider: 'tidb', status: databaseStatus, dashboardUrl: process.env.TIDB_DASHBOARD_URL || 'https://tidbcloud.com/', metrics: databaseMetrics, note: 'RU usage must be confirmed in TiDB Cloud when its API is unavailable.' },
      { provider: 'email', status: statusFor(emailMetrics), metrics: emailMetrics },
      { provider: 'render', status: 'unknown', dashboardUrl: process.env.RENDER_DASHBOARD_URL || 'https://dashboard.render.com/', metrics: [{ resource: 'free-instance-hours', used: null, limit: 750, unit: 'hours', percent: null, exact: false, source: 'provider-dashboard' }], note: 'Free-tier usage is confirmed in the provider dashboard.' },
      { provider: 'vercel', status: 'unknown', dashboardUrl: process.env.VERCEL_DASHBOARD_URL || 'https://vercel.com/dashboard', metrics: [{ resource: 'included-usage', used: null, limit: null, unit: 'provider units', percent: null, exact: false, source: 'provider-dashboard' }], note: 'Hobby usage is confirmed in the provider dashboard.' },
    ];
    return { checkedAt: new Date().toISOString(), providers };
  }

  async evaluateAndNotify(): Promise<void> {
    const snapshot = await this.snapshot();
    const recipients = (await AppDataSource.getRepository(User).find({ where: { isActive: true }, relations: ['userRoles','userRoles.role'] }))
      .filter(user => user.userRoles.some(item => ['Owner','Admin','Moderator'].includes(item.role.roleName))).map(user => user.userId);
    const periodKey = new Date().toISOString().slice(0, 7);
    for (const provider of snapshot.providers) for (const metric of provider.metrics) {
      if (!metric.exact || metric.percent == null) continue;
      const threshold = resolveCapacityThreshold(metric.percent, metric.exact);
      if (!threshold) continue;
      try {
        const alertRepo = AppDataSource.getRepository(SystemCapacityAlert);
        const previous = await alertRepo.createQueryBuilder('alert').where('alert.provider = :provider AND alert.resource = :resource AND alert.periodKey = :periodKey', { provider: provider.provider, resource: metric.resource, periodKey }).orderBy('alert.threshold', 'DESC').getOne();
        if (previous && Number(previous.threshold) >= threshold) continue;
        await alertRepo.save({ provider: provider.provider, resource: metric.resource, threshold, periodKey, measuredPercent: metric.percent });
        await NotificationHelper.notifySystemCapacity(provider.provider, metric.resource, threshold, recipients);
      } catch (error: any) {
        if (!String(error?.code || error?.message).includes('DUP')) throw error;
      }
    }
  }

  start(): void {
    if (process.env.NODE_ENV === 'test' || this.timer) return;
    const interval = Math.max(300_000, Number(process.env.CAPACITY_CHECK_INTERVAL_MS || 900_000));
    this.timer = setInterval(() => void this.evaluateAndNotify().catch(error => console.error('capacity_check_failed', error)), interval);
    this.timer.unref();
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
export const systemCapacityService = new SystemCapacityService();
