/**
 * OLYMPUS 2.0 - Team Emails
 */

export { invitationEmail } from './invitation';

// Re-export types
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/**
 * Send team-related email using configured provider.
 */
export async function sendTeamEmail(
  to: string,
  content: EmailContent,
  options?: { replyTo?: string }
): Promise<void> {
  const { RESEND_API_KEY, EMAIL_FROM = 'OLYMPUS <team@olympus.dev>' } = process.env;

  if (!RESEND_API_KEY) {
    console.log('[email] No RESEND_API_KEY configured, logging email:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${content.subject}`);
    console.log('---');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
        reply_to: options?.replyTo,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[email] Failed to send:', error);
      throw new Error(`Email send failed: ${error}`);
    }

    console.log(`[email] Sent "${content.subject}" to ${to}`);
  } catch (error) {
    console.error('[email] Error sending email:', error);
    throw error;
  }
}
