/**
 * OLYMPUS 2.0 - Team Invitation Email Template
 */

interface InvitationEmailProps {
  inviteeName: string;
  inviterName: string;
  teamName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
  personalMessage?: string;
}

export function invitationEmail(props: InvitationEmailProps): {
  subject: string;
  html: string;
  text: string;
} {
  const { inviteeName, inviterName, teamName, role, inviteUrl, expiresAt, personalMessage } = props;

  const subject = `${inviterName} invited you to join ${teamName} on OLYMPUS`;

  const roleDescription =
    {
      owner: 'full control over the team',
      admin: 'administrative access',
      developer: 'developer access',
      viewer: 'view-only access',
    }[role] || role;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #3b82f6; margin: 0;">You're Invited!</h1>
  </div>

  <p>Hi${inviteeName ? ` ${inviteeName}` : ''},</p>

  <p><strong>${inviterName}</strong> has invited you to join <strong>${teamName}</strong> on OLYMPUS as a <strong>${role}</strong> with ${roleDescription}.</p>

  ${
    personalMessage
      ? `
  <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; font-style: italic;">"${personalMessage}"</p>
    <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">- ${inviterName}</p>
  </div>
  `
      : ''
  }

  <p style="text-align: center; margin: 30px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
  </p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px; font-size: 16px;">What you'll get access to:</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      <li style="padding: 4px 0;">AI-powered code generation</li>
      <li style="padding: 4px 0;">35-agent build orchestrator</li>
      <li style="padding: 4px 0;">Real-time collaboration</li>
      <li style="padding: 4px 0;">Deployment to multiple platforms</li>
    </ul>
  </div>

  <p style="color: #6b7280; font-size: 14px;">This invitation expires on ${expiresAt}. If you didn't expect this invitation, you can safely ignore this email.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    If the button doesn't work, copy and paste this link:<br>
    <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
  </p>
</body>
</html>`;

  const text = `You're Invited to Join ${teamName}!

Hi${inviteeName ? ` ${inviteeName}` : ''},

${inviterName} has invited you to join ${teamName} on OLYMPUS as a ${role} with ${roleDescription}.

${personalMessage ? `Personal message from ${inviterName}:\n"${personalMessage}"\n\n` : ''}Accept your invitation: ${inviteUrl}

What you'll get access to:
- AI-powered code generation
- 35-agent build orchestrator
- Real-time collaboration
- Deployment to multiple platforms

This invitation expires on ${expiresAt}. If you didn't expect this invitation, you can safely ignore this email.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
