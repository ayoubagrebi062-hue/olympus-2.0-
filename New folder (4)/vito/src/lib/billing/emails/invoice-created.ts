/**
 * OLYMPUS 2.0 - Invoice Created Email Template
 */

interface InvoiceCreatedProps {
  userName: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  invoiceUrl: string;
  lineItems: Array<{ description: string; amount: number }>;
}

export function invoiceCreatedEmail(props: InvoiceCreatedProps): { subject: string; html: string; text: string } {
  const { userName, invoiceNumber, amount, currency, dueDate, invoiceUrl, lineItems } = props;
  const formattedAmount = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);

  const subject = `Invoice ${invoiceNumber} for ${formattedAmount}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #333; margin: 0;">Invoice ${invoiceNumber}</h1>
  </div>

  <p>Hi ${userName},</p>

  <p>A new invoice has been created for your account.</p>

  <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      ${lineItems.map(item => `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">${item.description}</td>
          <td style="padding: 8px 0; text-align: right;">${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(item.amount / 100)}</td>
        </tr>
      `).join('')}
      <tr style="border-top: 2px solid #e5e7eb;">
        <td style="padding: 12px 0 0; font-weight: 600;">Total</td>
        <td style="padding: 12px 0 0; text-align: right; font-weight: 700; font-size: 18px;">${formattedAmount}</td>
      </tr>
    </table>
  </div>

  <p style="color: #6b7280;">Due date: <strong>${dueDate}</strong></p>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${invoiceUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Invoice</a>
  </p>

  <p style="color: #6b7280; font-size: 14px;">This invoice will be automatically charged to your payment method on file.</p>

  <p>Thanks,<br>The OLYMPUS Team</p>
</body>
</html>`;

  const text = `Invoice ${invoiceNumber}

Hi ${userName},

A new invoice has been created for your account.

${lineItems.map(item => `${item.description}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(item.amount / 100)}`).join('\n')}

Total: ${formattedAmount}
Due date: ${dueDate}

View Invoice: ${invoiceUrl}

This invoice will be automatically charged to your payment method on file.

Thanks,
The OLYMPUS Team`;

  return { subject, html, text };
}
