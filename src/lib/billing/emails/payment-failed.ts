/**
 * OLYMPUS 2.0 - Payment Failed Email Template
 */

interface PaymentFailedProps {
  userName: string;
  planName: string;
  amount: number;
  currency: string;
  retryDate: string;
  updatePaymentUrl: string;
  failureReason?: string;
}

export function paymentFailedEmail(props: PaymentFailedProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, planName, amount, currency, retryDate, updatePaymentUrl, failureReason } =
    props;
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(
    amount / 100
  );

  const subject = `Action required: Payment failed for your ${planName} subscription`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #ef4444; margin: 0;">Payment Failed</h1>
  </div>

  <p>Hi ${userName},</p>

  <p>We were unable to process your payment of <strong>${formattedAmount}</strong> for your ${planName} subscription.</p>

  ${failureReason ? `<p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0;"><strong>Reason:</strong> ${failureReason}</p>` : ''}

  <p>Please update your payment method to avoid service interruption. We'll automatically retry the payment on <strong>${retryDate}</strong>.</p>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${updatePaymentUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Update Payment Method</a>
  </p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; font-size: 14px; color: #6b7280;"><strong>What happens next?</strong></p>
    <ul style="margin: 10px 0 0; padding-left: 20px; font-size: 14px; color: #6b7280;">
      <li>We'll retry the payment on ${retryDate}</li>
      <li>If payment continues to fail, your subscription may be paused</li>
      <li>You won't lose any data, but some features may be restricted</li>
    </ul>
  </div>

  <p style="color: #6b7280; font-size: 14px;">Need help? Reply to this email and we'll assist you.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Payment Failed

Hi ${userName},

We were unable to process your payment of ${formattedAmount} for your ${planName} subscription.

${failureReason ? `Reason: ${failureReason}` : ''}

Please update your payment method to avoid service interruption. We'll automatically retry the payment on ${retryDate}.

Update your payment method: ${updatePaymentUrl}

What happens next?
- We'll retry the payment on ${retryDate}
- If payment continues to fail, your subscription may be paused
- You won't lose any data, but some features may be restricted

Need help? Reply to this email and we'll assist you.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
