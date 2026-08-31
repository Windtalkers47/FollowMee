import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { UserNotificationSettings } from '../entities/UserNotificationSettings';

/**
 * Email Service
 * 
 * Sends email notifications using Nodemailer with SendGrid SMTP.
 * 
 * NEW-EMAIL-QUEUE: Email notification service
 * Cost: Free tier (SendGrid 100 emails/day)
 */

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailData {
  to: EmailRecipient;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private sendgridApiKey: string | null = null;
  private previewMode: boolean = false;
  private isConfigured: boolean = false;
  private dailyEmailCount: number = 0;
  private readonly DAILY_EMAIL_LIMIT = 100; // SendGrid free tier limit
  private lastResetDate: string = new Date().toDateString();

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   * Uses SendGrid SMTP or falls back to local SMTP
   */
  private initializeTransporter(): void {
    if (process.env.EMAIL_DELIVERY_MODE === 'preview') {
      if (process.env.NODE_ENV !== 'development' || process.env.DB_NAME !== 'followmee_e2e') {
        throw new Error('Email preview mode is restricted to development with DB_NAME=followmee_e2e');
      }
      this.previewMode = true;
      this.isConfigured = true;
      console.log('[EmailService] Local email preview configured');
      return;
    }

    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const sendgridFromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@followmee.com';

    if (sendgridApiKey) {
      // Render's outbound SMTP connection can time out on free instances. SendGrid's
      // HTTPS API uses the same key and is both faster and easier to bound safely.
      this.sendgridApiKey = sendgridApiKey;
      this.isConfigured = true;
      console.log('[EmailService] SendGrid HTTPS API configured');
    } else {
      // Fallback to local SMTP (for development)
      console.log('[EmailService] SendGrid not configured, using development mode');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      });
      this.isConfigured = true;
    }
  }

  /**
   * Check if email service is available
   */
  isAvailable(): boolean {
    return this.isConfigured && (this.previewMode || this.sendgridApiKey !== null || this.transporter !== null);
  }

  isLocalPreview(): boolean {
    return this.previewMode;
  }

  private async sendWithSendGridApi(mailOptions: SendMailOptions): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: String(mailOptions.to) }] }],
          from: { email: String(mailOptions.from) },
          subject: String(mailOptions.subject || ''),
          content: [
            ...(mailOptions.text ? [{ type: 'text/plain', value: String(mailOptions.text) }] : []),
            { type: 'text/html', value: String(mailOptions.html || '') },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { errors?: Array<{ message?: string; field?: string }> } | null;
        const diagnostic = (payload?.errors || []).map(item => `${item.message || ''} ${item.field || ''}`).join(' ').toLowerCase();
        const reason = /verified sender|sender identity|from address/.test(diagnostic)
          ? 'sender_identity'
          : /permission|authorization|access forbidden|api key/.test(diagnostic)
            ? 'authorization'
            : /suspend|deactivat|account/.test(diagnostic)
              ? 'account_status'
              : 'unknown';
        // Never log SendGrid's raw body: it can contain recipient or sender PII.
        console.error('[EmailService] SendGrid API rejected email', { status: response.status, reason });
        throw new Error(`SendGrid API returned ${response.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Check if we can send more emails today (NEW-EMAIL-QUEUE: Cost control)
   */
  canSendEmail(): boolean {
    // Reset count if it's a new day
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyEmailCount = 0;
      this.lastResetDate = today;
    }

    return this.dailyEmailCount < this.DAILY_EMAIL_LIMIT;
  }

  /**
   * Get current email usage
   */
  getEmailUsage(): {
    sent: number;
    limit: number;
    remaining: number;
  } {
    return {
      sent: this.dailyEmailCount,
      limit: this.DAILY_EMAIL_LIMIT,
      remaining: this.DAILY_EMAIL_LIMIT - this.dailyEmailCount,
    };
  }

  /**
   * Send email notification
   * 
   * NEW-EMAIL-QUEUE: Respects daily limit
   */
  async sendEmail(data: EmailData): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('[EmailService] Service not available');
      return false;
    }

    if (!this.canSendEmail()) {
      console.warn('[EmailService] Daily email limit reached');
      return false;
    }

    try {
      const mailOptions: SendMailOptions = {
        from: this.sendgridApiKey
          ? (process.env.SENDGRID_FROM_EMAIL || 'noreply@followmee.com')
          : (process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@followmee.local'),
        to: data.to.email,
        subject: data.subject,
        html: data.html,
        text: data.text,
      };

      if (this.previewMode) {
        // The registration service returns its verification URL directly in the
        // development-only API response. Never write tokens or recipient PII to logs.
      } else if (this.sendgridApiKey) await this.sendWithSendGridApi(mailOptions);
      else await this.transporter!.sendMail(mailOptions);
      this.dailyEmailCount++;

      console.log(`[EmailService] Email delivered (${this.dailyEmailCount}/${this.DAILY_EMAIL_LIMIT})`);
      return true;
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'UnknownError';
      console.error('[EmailService] Failed to send email', { errorType });
      return false;
    }
  }

  /**
   * Send notification email
   * 
   * NEW-EMAIL-QUEUE: Formatted notification email
   */
  async sendNotificationEmail(
    recipient: { email: string; name?: string },
    notification: {
      title: string;
      message: string;
      type: string;
      actionUrl?: string;
    },
    settings?: UserNotificationSettings | null,
    locale: 'en' | 'th' = 'en'
  ): Promise<boolean> {
    // Check if user has email enabled in settings
    if (settings && !settings.emailEnabled) {
      console.log('[EmailService] User has email disabled');
      return false;
    }

    const subject = `FollowMee: ${notification.title}`;
    const html = this.createNotificationEmailHtml(notification, locale);
    const text = this.createNotificationEmailText(notification, locale);

    return this.sendEmail({
      to: recipient,
      subject,
      html,
      text,
    });
  }

  /**
   * Create HTML email body for notification
   */
  private createNotificationEmailHtml(notification: {
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
  }, locale: 'en' | 'th'): string {
    const copy = locale === 'th'
      ? {
          button: 'ดูรายละเอียด',
          footer: 'คุณได้รับอีเมลนี้เพราะเปิดการแจ้งเตือนทางอีเมลใน FollowMee',
        }
      : {
          button: 'View details',
          footer: 'You received this email because email notifications are enabled in FollowMee.',
        };
    const actionButton = notification.actionUrl
      ? `<a href="${this.escapeHtml(notification.actionUrl)}" style="display:inline-block;padding:11px 20px;background:#6d4aff;color:#fff;text-decoration:none;border-radius:10px;margin-top:15px;font-weight:600">${copy.button}</a>`
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #6d4aff;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #6d4aff;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #1f2937;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .footer {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FollowMee</div>
    </div>
    
    <div class="title">${this.escapeHtml(notification.title)}</div>
    <div class="message">${this.escapeHtml(notification.message)}</div>
    
    ${actionButton}
    
    <div class="footer">
      <p>${copy.footer}</p>
      <p>&copy; ${new Date().getFullYear()} FollowMee. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create plain text email body for notification
   */
  private createNotificationEmailText(notification: {
    title: string;
    message: string;
    type: string;
    actionUrl?: string;
  }, locale: 'en' | 'th'): string {
    const labels = locale === 'th'
      ? {
          heading: 'การแจ้งเตือนจาก FollowMee',
          title: 'หัวข้อ',
          message: 'ข้อความ',
          details: 'ดูรายละเอียด',
          footer: 'คุณได้รับอีเมลนี้เพราะเปิดการแจ้งเตือนทางอีเมลใน FollowMee',
        }
      : {
          heading: 'FollowMee notification',
          title: 'Title',
          message: 'Message',
          details: 'View details',
          footer: 'You received this email because email notifications are enabled in FollowMee.',
        };
    return [
      labels.heading,
      '',
      `${labels.title}: ${notification.title}`,
      '',
      `${labels.message}: ${notification.message}`,
      notification.actionUrl ? `\n${labels.details}: ${notification.actionUrl}` : '',
      '',
      '--',
      labels.footer,
      `© ${new Date().getFullYear()} FollowMee.`,
    ].join('\n');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Send password reset email
   * 
   * NEW-EMAIL-QUEUE: Password reset email (counted against daily limit)
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    locale: 'en' | 'th' = 'en'
  ): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const subject = locale === 'th'
      ? 'FollowMee: คำขอตั้งรหัสผ่านใหม่'
      : 'FollowMee: Password Reset Request';
    const html = this.createPasswordResetEmailHtml(resetUrl, locale);
    const text = this.createPasswordResetEmailText(resetUrl, locale);

    return this.sendEmail({
      to: { email },
      subject,
      html,
      text,
    });
  }

  /**
   * Create HTML body for password reset email
   */
  private createPasswordResetEmailHtml(resetUrl: string, locale: 'en' | 'th'): string {
    const copy = locale === 'th'
      ? {
          title: 'คำขอตั้งรหัสผ่านใหม่',
          message: 'คุณได้ขอตั้งรหัสผ่านใหม่ คลิกปุ่มด้านล่างเพื่อดำเนินการ',
          button: 'ตั้งรหัสผ่านใหม่',
          important: 'สำคัญ:',
          warning: 'ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง หากคุณไม่ได้เป็นผู้ส่งคำขอ กรุณาไม่ต้องดำเนินการใด ๆ กับอีเมลนี้',
          rights: 'สงวนลิขสิทธิ์',
        }
      : {
          title: 'Password Reset Request',
          message: 'You requested a password reset. Click the button below to continue.',
          button: 'Reset Password',
          important: 'Important:',
          warning: "This link will expire in 1 hour. If you didn't request this reset, please ignore this email.",
          rights: 'All rights reserved.',
        };
    return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #10b981;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #1f2937;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 20px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #10b981;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
    }
    .footer {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 5px;
      padding: 10px;
      margin-top: 15px;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FollowMee</div>
    </div>
    
    <div class="title">${copy.title}</div>
    <div class="message">
      ${copy.message}
    </div>
    
    <a href="${resetUrl}" class="button">${copy.button}</a>
    
    <div class="warning">
      <strong>⚠️ ${copy.important}</strong> ${copy.warning}
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} FollowMee. ${copy.rights}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create plain text body for password reset email
   */
  private createPasswordResetEmailText(resetUrl: string, locale: 'en' | 'th'): string {
    if (locale === 'th') {
      return [
        'FollowMee — ตั้งรหัสผ่านใหม่',
        '',
        'คุณได้ขอตั้งรหัสผ่านใหม่',
        '',
        'เปิดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่:',
        resetUrl,
        '',
        'ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง',
        '',
        'หากคุณไม่ได้เป็นผู้ส่งคำขอ กรุณาไม่ต้องดำเนินการใด ๆ กับอีเมลนี้',
        '',
        '--',
        `© ${new Date().getFullYear()} FollowMee. สงวนลิขสิทธิ์`,
      ].join('\n');
    }

    return [
      'FollowMee Password Reset',
      '',
      'You requested a password reset.',
      '',
      'Open the link below to reset your password:',
      resetUrl,
      '',
      'This link will expire in 1 hour.',
      '',
      "If you didn't request this reset, please ignore this email.",
      '',
      '--',
      `© ${new Date().getFullYear()} FollowMee. All rights reserved.`,
    ].join('\n');
  }

  /**
   * Send batch digest email (W4-BATCH-DELIVERY)
   * 
   * Combines multiple notifications into a single digest email
   */
  async sendDigestEmail(
    recipient: { email: string; name?: string },
    notifications: Array<{
      title: string;
      message: string;
      type: string;
      actionUrl?: string;
      createdAt: Date;
    }>,
    digestPeriod: 'hourly' | 'daily' = 'hourly'
  ): Promise<boolean> {
    const subject = `FollowMee: ${digestPeriod === 'hourly' ? 'สรุปการแจ้งเตือนรายชั่วโมง' : 'สรุปการแจ้งเตือนรายวัน'}`;
    const html = this.createDigestEmailHtml(recipient, notifications, digestPeriod);
    const text = this.createDigestEmailText(recipient, notifications, digestPeriod);

    return this.sendEmail({
      to: recipient,
      subject,
      html,
      text,
    });
  }

  /**
   * Create HTML body for digest email
   */
  private createDigestEmailHtml(
    recipient: { email: string; name?: string },
    notifications: Array<{
      title: string;
      message: string;
      type: string;
      actionUrl?: string;
      createdAt: Date;
    }>,
    digestPeriod: 'hourly' | 'daily'
  ): string {
    const notificationItems = notifications.map(n => `
      <div style="border-left: 3px solid #10b981; padding-left: 15px; margin-bottom: 20px;">
        <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 5px;">
          ${this.escapeHtml(n.title)}
        </div>
        <div style="font-size: 14px; color: #4b5563; margin-bottom: 8px;">
          ${this.escapeHtml(n.message)}
        </div>
        ${n.actionUrl ? `<a href="${n.actionUrl}" style="font-size: 14px; color: #10b981; text-decoration: none;">ดูรายละเอียด →</a>` : ''}
        <div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
          ${new Date(n.createdAt).toLocaleString('th-TH')}
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #10b981;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
    }
    .greeting {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .summary {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 20px;
    }
    .footer {
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">FollowMee</div>
    </div>
    
    <div class="greeting">สวัสดีค่ะ, ${recipient.name || 'คุณ'} 👋</div>
    <div class="summary">
      นี่คือสรุปการแจ้งเตือน${digestPeriod === 'hourly' ? 'รายชั่วโมง' : 'รายวัน'}ของคุณ มีทั้งหมด ${notifications.length} การแจ้งเตือน
    </div>
    
    ${notificationItems}
    
    <div class="footer">
      <p>คุณได้รับอีเมลนี้เนื่องจากคุณได้เปิดการแจ้งเตือนทางอีเมลใน FollowMee</p>
      <p>© ${new Date().getFullYear()} FollowMee. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Create plain text body for digest email
   */
  private createDigestEmailText(
    recipient: { email: string; name?: string },
    notifications: Array<{
      title: string;
      message: string;
      type: string;
      actionUrl?: string;
      createdAt: Date;
    }>,
    digestPeriod: 'hourly' | 'daily'
  ): string {
    let text = `FollowMee ${digestPeriod === 'hourly' ? 'Hourly' : 'Daily'} Digest\n\n`;
    text += `สวัสดีค่ะ, ${recipient.name || 'คุณ'}\n\n`;
    text += `นี่คือสรุปการแจ้งเตือน${digestPeriod === 'hourly' ? 'รายชั่วโมง' : 'รายวัน'}ของคุณ:\n\n`;
    text += `มีทั้งหมด ${notifications.length} การแจ้งเตือน\n\n`;
    text += `${'─'.repeat(40)}\n\n`;
    
    notifications.forEach((n, i) => {
      text += `${i + 1}. ${n.title}\n`;
      text += `   ${n.message}\n`;
      if (n.actionUrl) text += `   ${n.actionUrl}\n`;
      text += `   ${new Date(n.createdAt).toLocaleString('th-TH')}\n\n`;
    });
    
    text += `${'─'.repeat(40)}\n\n`;
    text += `คุณได้รับอีเมลนี้เนื่องจากคุณได้เปิดการแจ้งเตือนทางอีเมลใน FollowMee\n`;
    text += `© ${new Date().getFullYear()} FollowMee. All rights reserved.`;
    
    return text;
  }

  /**
   * Send batch emails (W4-BATCH-DELIVERY: For future use)
   */
  async sendBatchEmails(emails: EmailData[]): Promise<{
    sent: number;
    failed: number;
  }> {
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      if (await this.sendEmail(email)) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  }

  async sendRegistrationVerificationEmail(email: string, verificationUrl: string): Promise<boolean> {
    const safeUrl = this.escapeHtml(verificationUrl);
    return this.sendEmail({
      to: { email }, subject: 'Verify your FollowMee UAT registration',
      html: `<p>Please confirm your email address before the Owner reviews your request.</p><p><a href="${safeUrl}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
      text: `Verify your FollowMee registration: ${verificationUrl}\nThis link expires in 24 hours.`,
    });
  }

  async sendRegistrationDecisionEmail(email: string, approved: boolean): Promise<boolean> {
    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    return this.sendEmail({
      to: { email }, subject: approved ? 'Your FollowMee access is ready' : 'FollowMee registration update',
      html: approved ? `<p>Your UAT access was approved.</p><p><a href="${this.escapeHtml(`${baseUrl}/login`)}">Sign in to FollowMee</a></p>` : '<p>Your UAT registration request was not approved. Contact the workspace Owner if you need help.</p>',
      text: approved ? `Your UAT access was approved. Sign in: ${baseUrl}/login` : 'Your UAT registration request was not approved.',
    });
  }
}

// Singleton instance
export const emailService = new EmailService();
