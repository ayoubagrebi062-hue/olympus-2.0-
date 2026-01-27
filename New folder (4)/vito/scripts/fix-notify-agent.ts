/**
 * FIX NOTIFY AGENT OUTPUT
 *
 * 1. Add 'resend' package to dependencies
 * 2. Fix email.service.ts with complete implementation
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { createClient } from '@supabase/supabase-js';

const BUILD_ID = 'bbb38798-2522-4214-aacc-906fbbc70779';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Complete email service with all required functions
const FIXED_EMAIL_SERVICE = `// src/lib/notifications/email.service.ts
// Email service using Resend for transactional emails

import { Resend } from 'resend';

// Initialize Resend with API key (fallback to empty string for build)
const resend = new Resend(process.env.RESEND_API_KEY || '');

// Email templates storage (in production, this would be in database)
const templates: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: 'Welcome to OLYMPUS, {{name}}!',
    html: \`
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Welcome to OLYMPUS!</h1>
        <p>Hi {{name}},</p>
        <p>Thanks for signing up. Your account has been created successfully.</p>
        <a href="{{dashboardUrl}}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
          Go to Dashboard
        </a>
      </div>
    \`,
  },
  'password-reset': {
    subject: 'Reset your OLYMPUS password',
    html: \`
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Password Reset</h1>
        <p>Hi {{name}},</p>
        <p>Click the button below to reset your password. This link expires in 1 hour.</p>
        <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
          Reset Password
        </a>
        <p style="color: #666; font-size: 12px; margin-top: 24px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    \`,
  },
  notification: {
    subject: '{{subject}}',
    html: \`
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <p>{{message}}</p>
      </div>
    \`,
  },
};

/**
 * Get an email template by ID
 */
async function getTemplate(templateId: string): Promise<{ subject: string; html: string }> {
  const template = templates[templateId];
  if (!template) {
    throw new Error(\`Email template '\${templateId}' not found\`);
  }
  return template;
}

/**
 * Replace template variables with actual values
 */
function interpolate(text: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce((result, [key, value]) => {
    return result.replace(new RegExp('{{' + key + '}}', 'g'), value);
  }, text);
}

/**
 * Send an email using a template
 */
export async function sendEmail(
  to: string,
  templateId: string,
  variables: Record<string, string>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const template = await getTemplate(templateId);
    const subject = interpolate(template.subject, variables);
    const html = interpolate(template.html, variables);

    const fromEmail = process.env.EMAIL_FROM || 'noreply@olympus.app';

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

/**
 * Send a batch of emails
 */
export async function sendBatchEmails(
  recipients: Array<{ to: string; variables: Record<string, string> }>,
  templateId: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendEmail(recipient.to, templateId, recipient.variables);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
`;

async function main() {
  console.log('='.repeat(60));
  console.log('FIXING NOTIFY AGENT OUTPUT');
  console.log('='.repeat(60));

  try {
    // 1. Add resend package to ARCHON's package.json
    console.log('[1] Adding resend to package.json...');
    const { data: archon } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'archon')
      .single();

    if (!archon) throw new Error('ARCHON output not found');

    let archonArtifacts = archon.artifacts || [];
    const pkgIndex = archonArtifacts.findIndex((a: any) => a.path === 'package.json');
    if (pkgIndex === -1) throw new Error('package.json not found');

    const pkgJson = JSON.parse(archonArtifacts[pkgIndex].content);
    pkgJson.dependencies = {
      ...pkgJson.dependencies,
      'resend': '^2.1.0',
    };

    // Sort dependencies
    pkgJson.dependencies = Object.keys(pkgJson.dependencies)
      .sort()
      .reduce((acc: Record<string, string>, key: string) => {
        acc[key] = pkgJson.dependencies[key];
        return acc;
      }, {});

    archonArtifacts[pkgIndex].content = JSON.stringify(pkgJson, null, 2);

    const { error: archonError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: archonArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'archon');

    if (archonError) throw new Error(`Failed to update ARCHON: ${archonError.message}`);
    console.log('[1] Added: resend ^2.1.0');

    // 2. Fix email.service.ts in NOTIFY output
    console.log('[2] Fixing email.service.ts...');
    const { data: notify } = await supabase
      .from('build_agent_outputs')
      .select('*')
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'notify')
      .single();

    if (!notify) throw new Error('NOTIFY output not found');

    let notifyArtifacts = notify.artifacts || [];
    notifyArtifacts = notifyArtifacts.filter((a: any) => a.path !== 'src/lib/notifications/email.service.ts');
    notifyArtifacts.push({
      type: 'code',
      path: 'src/lib/notifications/email.service.ts',
      content: FIXED_EMAIL_SERVICE,
    });

    const { error: notifyError } = await supabase
      .from('build_agent_outputs')
      .update({ artifacts: notifyArtifacts, updated_at: new Date().toISOString() })
      .eq('build_id', BUILD_ID)
      .eq('agent_id', 'notify');

    if (notifyError) throw new Error(`Failed to update NOTIFY: ${notifyError.message}`);
    console.log('[2] Fixed: email.service.ts - added getTemplate, interpolate functions');

    console.log('='.repeat(60));
    console.log('SUCCESS! NOTIFY agent issues fixed.');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

main();
