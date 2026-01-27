// Email service - stub implementation
// Requires RESEND_API_KEY environment variable and resend package

interface EmailTemplate {
  html: string;
  subject: string;
}

// Template storage (stub)
const templates: Record<string, EmailTemplate> = {};

function getTemplate(templateId: string): EmailTemplate {
  return templates[templateId] || { html: '', subject: '' };
}

function interpolate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

export async function sendEmail(
  to: string,
  templateId: string,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  // Stub implementation - replace with actual resend integration
  const template = getTemplate(templateId);
  const html = interpolate(template.html, variables);
  const subject = interpolate(template.subject, variables);

  console.log(`[Email] Would send to ${to}: ${subject}`);
  console.log(`[Email] HTML content: ${html.substring(0, 100)}...`);

  // Return success in stub mode
  return { success: true };
}

export function registerTemplate(id: string, template: EmailTemplate): void {
  templates[id] = template;
}
