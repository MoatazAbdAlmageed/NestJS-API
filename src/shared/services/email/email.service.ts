// src/shared/services/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);
  private readonly templates: Map<string, Handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadDefaultTemplates();
  }

  private async initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: true,
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.password'),
      },
    });
  }

  private loadDefaultTemplates() {
    const organizationInviteTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Organization Invitation</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #4CAF50;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
              }
              .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  font-size: 12px;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <h1>Organization Invitation</h1>
          <p>Hello!</p>
          <p>You have been invited by {{inviterName}} to join {{organizationName}}.</p>
          <p>Click the button below to accept the invitation:</p>
          <a href="{{inviteLink}}" class="button">Accept Invitation</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>{{inviteLink}}</p>
          <div class="footer">
              <p>Best regards,<br>Your App Team</p>
              <p>&copy; {{year}} Your App. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    const welcomeTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Welcome to Our Platform</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #4CAF50;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
              }
              .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  font-size: 12px;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <h1>Welcome to Our Platform!</h1>
          <p>Hello {{userName}},</p>
          <p>Thank you for joining our platform. We're excited to have you on board!</p>
          <p>Click the button below to login to your account:</p>
          <a href="{{loginLink}}" class="button">Login to Your Account</a>
          <div class="footer">
              <p>Best regards,<br>Your App Team</p>
              <p>&copy; {{year}} Your App. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    const passwordResetTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Password Reset</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
              }
              .button {
                  display: inline-block;
                  padding: 10px 20px;
                  background-color: #4CAF50;
                  color: white;
                  text-decoration: none;
                  border-radius: 5px;
                  margin: 20px 0;
              }
              .footer {
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #eee;
                  font-size: 12px;
                  color: #666;
              }
          </style>
      </head>
      <body>
          <h1>Password Reset Request</h1>
          <p>Hello {{userName}},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <a href="{{resetLink}}" class="button">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
              <p>Best regards,<br>Your App Team</p>
              <p>&copy; {{year}} Your App. All rights reserved.</p>
          </div>
      </body>
      </html>
    `;

    try {
      this.templates.set('organization-invite', Handlebars.compile(organizationInviteTemplate));
      this.templates.set('welcome', Handlebars.compile(welcomeTemplate));
      this.templates.set('reset-password', Handlebars.compile(passwordResetTemplate));
    } catch (error) {
      this.logger.error('Failed to compile email templates:', error);
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    templateName: string,
    context: any,
  ): Promise<boolean> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Email template ${templateName} not found`);
      }

      const html = template(context);

      await this.transporter.sendMail({
        from: this.configService.get<string>('email.from'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  async sendOrganizationInvite(
    to: string,
    organizationName: string,
    inviterName: string,
  ): Promise<boolean> {
    const subject = `Invitation to join ${organizationName}`;
    const context = {
      organizationName,
      inviterName,
      inviteLink: `${this.configService.get<string>('app.url')}/accept-invite`,
      year: new Date().getFullYear(),
    };

    return this.sendEmail(to, subject, 'organization-invite', context);
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const subject = 'Welcome to our platform!';
    const context = {
      userName,
      loginLink: `${this.configService.get<string>('app.url')}/login`,
      year: new Date().getFullYear(),
    };

    return this.sendEmail(to, subject, 'welcome', context);
  }

  async sendPasswordResetEmail(
    to: string,
    userName: string,
    resetToken: string,
  ): Promise<boolean> {
    const subject = 'Password Reset Request';
    const context = {
      userName,
      resetLink: `${this.configService.get<string>('app.url')}/reset-password?token=${resetToken}`,
      year: new Date().getFullYear(),
    };

    return this.sendEmail(to, subject, 'reset-password', context);
  }
}