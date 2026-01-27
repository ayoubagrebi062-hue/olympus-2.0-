/**
 * OLYMPUS 2.0 - Trial Expired Email Template
 */

interface TrialExpiredProps {
  userName: string;
  planName: string;
  upgradeUrl: string;
  dataRetentionDays: number;
}

export function trialExpiredEmail(props: TrialExpiredProps): { subject: string; html: string; text: string } {
  const { userName, planName, upgradeUrl, dataRetentionDays } = props;

  const subject = `Your ${planName} trial has ended`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6b7280; margin: 0;">Trial Ended</h1>
  </div>

  <p>Hi ${userName},</p>

  <p>Your ${planName} trial has ended. You've been moved to the Free plan.</p>

  <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;"><strong>Good news:</strong> Your projects and data are safe! We'll keep everything for ${dataRetentionDays} days while you decide.</p>
  </div>

  <p>Here's what's changed:</p>
  <ul style="color: #6b7280;">
    <li>Limited to 3 builds per month</li>
    <li>1 deploy per month</li>
    <li>100MB storage</li>
    <li>Basic features only</li>
  </ul>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${upgradeUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Upgrade to ${planName}</a>
  </p>

  <p style="color: #6b7280; font-size: 14px;">Questions? We're here to help — just reply to this email.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Trial Ended

Hi ${userName},

Your ${planName} trial has ended. You've been moved to the Free plan.

Good news: Your projects and data are safe! We'll keep everything for ${dataRetentionDays} days while you decide.

Here's what's changed:
- Limited to 3 builds per month
- 1 deploy per month
- 100MB storage
- Basic features only

Upgrade to ${planName}: ${upgradeUrl}

Questions? We're here to help — just reply to this email.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
