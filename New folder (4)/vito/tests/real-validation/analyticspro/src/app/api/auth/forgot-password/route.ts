import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { tokenStore } from '@/lib/auth/token-store';

// Create email transporter based on available credentials
function createTransporter() {
  // Option 1: Gmail SMTP (recommended - you have credentials)
  if (process.env.GMAIL_EMAIL && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // Option 2: Resend API (if configured)
  if (process.env.RESEND_API_KEY) {
    // Resend uses SMTP at smtp.resend.com
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
  }

  // Option 3: Custom SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Create transporter
    const transporter = createTransporter();

    if (!transporter) {
      return NextResponse.json(
        {
          error: 'Email service not configured',
          message: 'Add email credentials to .env.local. Options: GMAIL_EMAIL + GMAIL_APP_PASSWORD, or RESEND_API_KEY, or custom SMTP settings.',
          configured: false
        },
        { status: 503 }
      );
    }

    // Generate secure reset token
    const token = crypto.randomUUID();
    const expiry = Date.now() + 3600000; // 1 hour from now

    // Store token with email and expiry
    tokenStore.set(token, { email, expiry });

    // Get app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Get from email address
    const fromEmail = process.env.GMAIL_EMAIL || process.env.RESEND_FROM_EMAIL || 'noreply@analyticspro.com';

    // Send email
    await transporter.sendMail({
      from: `"AnalyticsPro" <${fromEmail}>`,
      to: email,
      subject: 'Reset your AnalyticsPro password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
            .header { background: #6366f1; color: #fff; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 32px; }
            .content p { color: #4b5563; line-height: 1.6; margin: 16px 0; }
            .btn { display: inline-block; background: #6366f1; color: #fff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
            .footer { padding: 24px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
            .footer p { color: #6b7280; font-size: 14px; margin: 0; }
            .link { color: #6366f1; word-break: break-all; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AnalyticsPro</h1>
            </div>
            <div class="content">
              <h2 style="color: #111827; margin-top: 0;">Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="btn">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p class="link">${resetLink}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This email was sent by AnalyticsPro. If you have questions, contact support.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Reset Your Password

We received a request to reset your password.

Click this link to reset your password:
${resetLink}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
      `,
    });

    console.log(`Password reset email sent to ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
