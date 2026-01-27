/**
 * OLYMPUS 2.0 - Usage Warning Email Template
 */

interface UsageWarningProps {
  userName: string;
  metric: string;
  metricLabel: string;
  current: number;
  limit: number;
  percentage: number;
  upgradeUrl: string;
  isCritical: boolean;
}

export function usageWarningEmail(props: UsageWarningProps): { subject: string; html: string; text: string } {
  const { userName, metricLabel, current, limit, percentage, upgradeUrl, isCritical } = props;

  const subject = isCritical
    ? `You've used ${percentage}% of your ${metricLabel.toLowerCase()}`
    : `Heads up: You've used ${percentage}% of your ${metricLabel.toLowerCase()}`;

  const color = isCritical ? '#ef4444' : '#f59e0b';
  const remaining = limit - current;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: ${color}; margin: 0;">${isCritical ? 'Usage Critical' : 'Usage Alert'}</h1>
  </div>

  <p>Hi ${userName},</p>

  <p>You've used <strong>${percentage}%</strong> of your monthly ${metricLabel.toLowerCase()} allowance.</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <span style="color: #6b7280;">${metricLabel}</span>
      <span style="font-weight: 600;">${current.toLocaleString()} / ${limit.toLocaleString()}</span>
    </div>
    <div style="background: #e5e7eb; border-radius: 4px; height: 8px; overflow: hidden;">
      <div style="background: ${color}; height: 100%; width: ${Math.min(percentage, 100)}%;"></div>
    </div>
    <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;"><strong>${remaining.toLocaleString()}</strong> remaining this month</p>
  </div>

  ${isCritical ? `<p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; color: #991b1b;">When you reach your limit, you won't be able to perform more ${metricLabel.toLowerCase()} until next month or until you upgrade.</p>` : ''}

  <p style="text-align: center; margin: 30px 0;">
    <a href="${upgradeUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Upgrade for More</a>
  </p>

  <p style="color: #6b7280; font-size: 14px;">Usage resets on the 1st of each month.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Usage ${isCritical ? 'Critical' : 'Alert'}

Hi ${userName},

You've used ${percentage}% of your monthly ${metricLabel.toLowerCase()} allowance.

${metricLabel}: ${current.toLocaleString()} / ${limit.toLocaleString()}
${remaining.toLocaleString()} remaining this month

${isCritical ? `When you reach your limit, you won't be able to perform more ${metricLabel.toLowerCase()} until next month or until you upgrade.` : ''}

Upgrade for more: ${upgradeUrl}

Usage resets on the 1st of each month.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
