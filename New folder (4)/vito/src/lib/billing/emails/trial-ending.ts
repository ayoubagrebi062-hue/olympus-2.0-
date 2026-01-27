/**
 * OLYMPUS 2.0 - Trial Ending Email Template
 */

interface TrialEndingProps {
  userName: string;
  planName: string;
  daysRemaining: number;
  trialEndDate: string;
  upgradeUrl: string;
  features: string[];
}

export function trialEndingEmail(props: TrialEndingProps): { subject: string; html: string; text: string } {
  const { userName, planName, daysRemaining, trialEndDate, upgradeUrl, features } = props;

  const urgency = daysRemaining <= 1 ? 'expires tomorrow' : `ends in ${daysRemaining} days`;
  const subject = `Your ${planName} trial ${urgency}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f59e0b; margin: 0;">Trial Ending Soon</h1>
  </div>

  <p>Hi ${userName},</p>

  <p>Your ${planName} trial ${urgency} on <strong>${trialEndDate}</strong>.</p>

  <p>Don't lose access to these features you've been using:</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <ul style="margin: 0; padding-left: 20px;">
      ${features.slice(0, 5).map(f => `<li style="padding: 4px 0;">${f}</li>`).join('')}
    </ul>
  </div>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${upgradeUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Continue with ${planName}</a>
  </p>

  <p style="color: #6b7280; font-size: 14px;">After your trial ends, you'll be moved to the Free plan. You can upgrade anytime to regain access to ${planName} features.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Trial Ending Soon

Hi ${userName},

Your ${planName} trial ${urgency} on ${trialEndDate}.

Don't lose access to these features you've been using:
${features.slice(0, 5).map(f => `- ${f}`).join('\n')}

Continue with ${planName}: ${upgradeUrl}

After your trial ends, you'll be moved to the Free plan. You can upgrade anytime to regain access to ${planName} features.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
