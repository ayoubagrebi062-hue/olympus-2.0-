/**
 * OLYMPUS 2.0 - Subscription Canceled Email Template
 */

interface SubscriptionCanceledProps {
  userName: string;
  planName: string;
  endDate: string;
  reactivateUrl: string;
  immediate: boolean;
}

export function subscriptionCanceledEmail(props: SubscriptionCanceledProps): { subject: string; html: string; text: string } {
  const { userName, planName, endDate, reactivateUrl, immediate } = props;

  const subject = immediate
    ? `Your ${planName} subscription has been canceled`
    : `Your ${planName} subscription will end on ${endDate}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6b7280; margin: 0;">Subscription ${immediate ? 'Canceled' : 'Ending'}</h1>
  </div>

  <p>Hi ${userName},</p>

  ${immediate
    ? `<p>Your ${planName} subscription has been canceled. You've been moved to the Free plan.</p>`
    : `<p>As requested, your ${planName} subscription will be canceled on <strong>${endDate}</strong>. You'll continue to have full access until then.</p>`
  }

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <p style="margin: 0 0 10px; font-weight: 600;">We'd love to have you back</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Changed your mind? You can reactivate your subscription anytime${immediate ? '' : ' before ' + endDate}.</p>
  </div>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${reactivateUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Reactivate Subscription</a>
  </p>

  <p style="color: #6b7280; font-size: 14px;">We'd love to hear your feedback. What could we have done better? Just reply to this email.</p>

  <p>Thanks for being a customer,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Subscription ${immediate ? 'Canceled' : 'Ending'}

Hi ${userName},

${immediate
  ? `Your ${planName} subscription has been canceled. You've been moved to the Free plan.`
  : `As requested, your ${planName} subscription will be canceled on ${endDate}. You'll continue to have full access until then.`
}

We'd love to have you back
Changed your mind? You can reactivate your subscription anytime${immediate ? '' : ' before ' + endDate}.

Reactivate Subscription: ${reactivateUrl}

We'd love to hear your feedback. What could we have done better? Just reply to this email.

Thanks for being a customer,
The OLYMPUS Team`;

  return { subject, html, text };
}
