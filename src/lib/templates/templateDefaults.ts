export interface DefaultTemplate {
  name: string;
  subject: string;
  body: string;
  category: string;
  isDefault: true;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Sponsor Outreach",
    subject: "Sponsorship Opportunity with {{creator_show}}",
    category: "outreach",
    isDefault: true,
    body: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2563eb; padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">{{creator_show}}</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
    <h2 style="margin: 0 0 24px; color: #1f2937; font-size: 24px; font-weight: 700;">Sponsorship Opportunity</h2>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi {{sponsor_name}},</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">{{creator_name}} here from <strong>{{creator_show}}</strong>. We're reaching out because we believe there's a great fit for a sponsorship partnership between our show{{#if sponsor_company}} and {{sponsor_company}}{{/if}}.</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0 0 8px; font-weight: 600; color: #1f2937; font-size: 16px;">Partnership Overview</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">We'd love to explore how we can help you reach your target audience through our platform. Our listeners are highly engaged and align well with brands looking to connect with passionate communities.</p>
    {{#if deal_amount}}
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0; color: #6b7280; font-size: 14px;">Proposed Investment: <strong style="color: #1f2937;">{{deal_amount}}</strong></p>
    {{/if}}
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">We'd love to discuss this opportunity further. Please reply to this email or use the link below to review our full media kit and proposal details.</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Looking forward to hearing from you!</p>
    <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">
      Best regards,<br />
      <strong>{{creator_name}}</strong><br />
      {{creator_show}}
    </p>
  </div>
  <div style="padding: 16px 0; text-align: center;">
    <p style="margin: 0; color: #6b7280; font-size: 12px;">Sent via <a href="https://sponsorsync.app" style="color: #2563eb;">SponsorSync</a> — Sponsorship management for creators</p>
  </div>
</div>`,
  },
  {
    name: "Deliverable Confirmation",
    subject: "Deliverable Confirmed: {{deliverable_title}}",
    category: "deliverable",
    isDefault: true,
    body: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2563eb; padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">{{creator_show}}</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
    <div style="display: inline-block; background-color: #ecfdf5; border-radius: 6px; padding: 6px 16px; margin-bottom: 24px;">
      <span style="color: #059669; font-size: 14px; font-weight: 600;">Deliverable Confirmed</span>
    </div>
    <h2 style="margin: 0 0 24px; color: #1f2937; font-size: 24px; font-weight: 700;">{{deliverable_title}}</h2>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi {{sponsor_name}},</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">We're confirming the deliverable details for our sponsorship agreement. Here's a summary of what's been scheduled:</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <table style="width: 100%; font-size: 14px;">
      <tr style="margin-bottom: 12px;"><td style="color: #6b7280; padding: 8px 0; width: 40%;">Deliverable</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deliverable_title}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Deal</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_title}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Due Date</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{due_date}}</td></tr>
    </table>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">We'll keep you updated on the progress and notify you once it's been completed. If you have any questions, please don't hesitate to reach out.</p>
    <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">Best,<br /><strong>{{creator_name}}</strong><br />{{creator_show}}</p>
  </div>
  <div style="padding: 16px 0; text-align: center;">
    <p style="margin: 0; color: #6b7280; font-size: 12px;">Sent via <a href="https://sponsorsync.app" style="color: #2563eb;">SponsorSync</a> — Sponsorship management for creators</p>
  </div>
</div>`,
  },
  {
    name: "Invoice Reminder",
    subject: "Invoice Reminder: {{invoice_amount}} for {{deal_title}}",
    category: "payment",
    isDefault: true,
    body: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2563eb; padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">{{creator_show}}</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
    <div style="display: inline-block; background-color: #fffbeb; border-radius: 6px; padding: 6px 16px; margin-bottom: 24px;">
      <span style="color: #d97706; font-size: 14px; font-weight: 600;">Payment Reminder</span>
    </div>
    <h2 style="margin: 0 0 24px; color: #1f2937; font-size: 24px; font-weight: 700;">Invoice {{invoice_number}}</h2>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi {{sponsor_name}},</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">This is a friendly reminder that invoice <strong>{{invoice_number}}</strong> for <strong>{{invoice_amount}}</strong> is due on <strong>{{payment_due_date}}</strong>.</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <table style="width: 100%; font-size: 14px;">
      <tr><td style="color: #6b7280; padding: 8px 0; width: 40%;">Invoice</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{invoice_number}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Amount</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{invoice_amount}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Deal</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_title}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Due Date</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{payment_due_date}}</td></tr>
    </table>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">If payment has already been sent, please disregard this notice. Thank you for your partnership!</p>
    <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">Best,<br /><strong>{{creator_name}}</strong><br />{{creator_show}}</p>
  </div>
  <div style="padding: 16px 0; text-align: center;">
    <p style="margin: 0; color: #6b7280; font-size: 12px;">Sent via <a href="https://sponsorsync.app" style="color: #2563eb;">SponsorSync</a> — Sponsorship management for creators</p>
  </div>
</div>`,
  },
  {
    name: "Contract Renewal",
    subject: "Renewal Proposal: {{deal_title}}",
    category: "renewal",
    isDefault: true,
    body: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2563eb; padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">{{creator_show}}</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
    <div style="display: inline-block; background-color: #eff6ff; border-radius: 6px; padding: 6px 16px; margin-bottom: 24px;">
      <span style="color: #2563eb; font-size: 14px; font-weight: 600;">Renewal Proposal</span>
    </div>
    <h2 style="margin: 0 0 24px; color: #1f2937; font-size: 24px; font-weight: 700;">Let's Continue Our Partnership</h2>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi {{sponsor_name}},</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Our sponsorship for <strong>{{deal_title}}</strong> has been a great success, and we'd love to continue working together! Here's our proposal for the renewal:</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <table style="width: 100%; font-size: 14px;">
      <tr><td style="color: #6b7280; padding: 8px 0; width: 40%;">Previous Deal</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_title}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Previous Value</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_amount}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Proposed Start</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_start_date}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Proposed End</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_end_date}}</td></tr>
    </table>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">We've grown significantly since our partnership began and are excited about the opportunities ahead. Let's schedule a call to discuss the details.</p>
    <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">Looking forward to continuing our partnership!<br /><br /><strong>{{creator_name}}</strong><br />{{creator_show}}</p>
  </div>
  <div style="padding: 16px 0; text-align: center;">
    <p style="margin: 0; color: #6b7280; font-size: 12px;">Sent via <a href="https://sponsorsync.app" style="color: #2563eb;">SponsorSync</a> — Sponsorship management for creators</p>
  </div>
</div>`,
  },
  {
    name: "Deliverable Complete",
    subject: "Deliverable Complete: {{deliverable_title}}",
    category: "deliverable",
    isDefault: true,
    body: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #2563eb; padding: 32px 40px; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">{{creator_show}}</h1>
  </div>
  <div style="background-color: #ffffff; padding: 40px; border: 1px solid #e5e7eb;">
    <div style="display: inline-block; background-color: #ecfdf5; border-radius: 6px; padding: 6px 16px; margin-bottom: 24px;">
      <span style="color: #059669; font-size: 14px; font-weight: 600;">Completed</span>
    </div>
    <h2 style="margin: 0 0 24px; color: #1f2937; font-size: 24px; font-weight: 700;">Deliverable Complete</h2>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Hi {{sponsor_name}},</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Great news! We've completed the deliverable <strong>{{deliverable_title}}</strong> as part of our sponsorship agreement for <strong>{{deal_title}}</strong>.</p>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <table style="width: 100%; font-size: 14px;">
      <tr><td style="color: #6b7280; padding: 8px 0; width: 40%;">Deliverable</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deliverable_title}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Deal</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{deal_title}}</td></tr>
      <tr><td style="color: #6b7280; padding: 8px 0;">Completed On</td><td style="color: #1f2937; font-weight: 600; padding: 8px 0;">{{due_date}}</td></tr>
    </table>
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">The content has been published and is now live. We're thrilled with how it turned out and hope you are too!</p>
    <p style="margin: 0 0 16px; color: #1f2937; font-size: 16px; line-height: 1.6;">Please let us know if you have any feedback or questions.</p>
    <p style="margin: 0; color: #1f2937; font-size: 16px; line-height: 1.6;">Thank you for your partnership!<br /><br /><strong>{{creator_name}}</strong><br />{{creator_show}}</p>
  </div>
  <div style="padding: 16px 0; text-align: center;">
    <p style="margin: 0; color: #6b7280; font-size: 12px;">Sent via <a href="https://sponsorsync.app" style="color: #2563eb;">SponsorSync</a> — Sponsorship management for creators</p>
  </div>
</div>`,
  },
];

export function getDefaultTemplateByCategory(category: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find((t) => t.category === category);
}

export const TEMPLATE_CATEGORIES = [
  { value: "outreach", label: "Outreach" },
  { value: "deliverable", label: "Deliverable" },
  { value: "payment", label: "Payment" },
  { value: "renewal", label: "Renewal" },
  { value: "custom", label: "Custom" },
] as const;
