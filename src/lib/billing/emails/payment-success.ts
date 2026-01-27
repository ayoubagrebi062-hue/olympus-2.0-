/**
 * OLYMPUS 2.0 - Payment Success Email Template
 */

import { PLAN_DISPLAY_NAMES } from '@/lib/billing/constants';
import type { PlanTier } from '@/lib/billing/types';

interface PaymentSuccessProps {
  userName: string;
  planName: string;
  planTier: PlanTier;
  amount: number;
  currency: string;
  invoiceUrl?: string;
  billingPeriod: 'monthly' | 'annual';
}

export function paymentSuccessEmail(props: PaymentSuccessProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planName, amount, currency, invoiceUrl, billingPeriod } = props;
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    amount / 100
  );

  const subject = `Payment received - ${formattedAmount}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #10b981; margin: 0;">✓ Payment Successful</h1>
  </div>

  <p>Hi ${userName},</p>

  <p>Thank you for your payment! Your ${planName} subscription has been renewed.</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px 0; color: #6b7280;">Plan</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${planName}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Billing</td><td style="padding: 8px 0; text-align: right;">${billingPeriod === 'annual' ? 'Annual' : 'Monthly'}</td></tr>
      <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0 0; color: #6b7280;">Amount paid</td><td style="padding: 12px 0 0; text-align: right; font-weight: 700; font-size: 18px;">${formattedAmount}</td></tr>
    </table>
  </div>

  ${invoiceUrl ? `<p style="text-align: center;"><a href="${invoiceUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Invoice</a></p>` : ''}

  <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Questions about your billing? Just reply to this email.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Payment Successful

Hi ${userName},

Thank you for your payment! Your ${planName} subscription has been renewed.

Plan: ${planName}
Billing: ${billingPeriod === 'annual' ? 'Annual' : 'Monthly'}
Amount paid: ${formattedAmount}

${invoiceUrl ? `View your invoice: ${invoiceUrl}` : ''}

Questions about your billing? Just reply to this email.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
