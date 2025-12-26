import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
      // console.log('Sending password reset email to:', email);
      const options = this.transporter.options as any;
      // console.log('SMTP Config:', {
      //   host: options.host,
      //   port: options.port,
      //   secure: options.secure,
      //   user: options.auth?.user
      // });

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      const currentYear = new Date().getFullYear();
      
      const mailOptions = {
        from: `"FollowMee" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: '🔑 Reset Your FollowMee Password',
        html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - FollowMee</title>
            <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap" rel="stylesheet">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Kanit', Arial, sans-serif; background-color: #f5f7fa; color: #333;">
            <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                <!-- Header -->
                <tr>
                    <td style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">FollowMee</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Your Journey, Your Way</p>
                    </td>
                </tr>
                
                <!-- Content -->
                <tr>
                    <td style="padding: 40px 30px;">
                        <h2 style="color: #2d3748; margin-top: 0; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
                        <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">Hello,</p>
                        <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">We received a request to reset your FollowMee account password. Click the button below to set a new password:</p>
                        
                        <!-- Button -->
                        <table cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                            <tr>
                                <td align="center" style="border-radius: 8px;" bgcolor="#4f46e5">
                                    <a href="${resetUrl}" target="_blank" style="font-size: 16px; font-weight: 500; color: #ffffff; text-decoration: none; border-radius: 8px; padding: 12px 30px; border: 1px solid #4f46e5; display: inline-block; background: #4f46e5;">
                                        Reset Password
                                    </a>
                                </td>
                            </tr>
                        </table>
                        
                        <p style="font-size: 14px; line-height: 1.6; color: #718096;">Or copy and paste this link into your browser:</p>
                        <p style="font-size: 14px; word-break: break-all; color: #4a5568; background-color: #f7fafc; padding: 12px; border-radius: 6px; border-left: 4px solid #e2e8f0;">
                            ${resetUrl}
                        </p>
                        
                        <p style="font-size: 14px; color: #718096; margin-top: 30px;">
                            <strong>Note:</strong> This link will expire in 1 hour for security reasons.
                        </p>
                        
                        <p style="font-size: 14px; color: #718096; margin: 30px 0 0;">
                            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                    </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                    <td style="padding: 20px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px;">© ${currentYear} FollowMee. All rights reserved.</p>
                        <p style="margin: 0; font-size: 11px; color: #a0aec0;">
                            FollowMee, 123 Digital Road, Bangkok 10110, Thailand
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `,
      };
      
      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      const info = await this.transporter.sendMail(mailOptions);
      // console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }
}

export default new EmailService();
