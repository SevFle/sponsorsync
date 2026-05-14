export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "sponsor_name", label: "Sponsor Name", description: "Name of the sponsor contact", required: true },
  { key: "sponsor_company", label: "Sponsor Company", description: "Company name of the sponsor", required: false },
  { key: "sponsor_email", label: "Sponsor Email", description: "Email address of the sponsor", required: false },
  { key: "creator_name", label: "Creator Name", description: "Your name", required: true },
  { key: "creator_show", label: "Show Name", description: "Your podcast or newsletter name", required: true },
  { key: "deal_title", label: "Deal Title", description: "Title of the sponsorship deal", required: false },
  { key: "deal_amount", label: "Deal Amount", description: "Monetary value of the deal", required: false },
  { key: "deal_start_date", label: "Deal Start Date", description: "Start date of the deal", required: false },
  { key: "deal_end_date", label: "Deal End Date", description: "End date of the deal", required: false },
  { key: "deliverable_description", label: "Deliverable Description", description: "Description of the deliverable", required: false },
  { key: "due_date", label: "Due Date", description: "Deadline or due date", required: false },
  { key: "deliverable_title", label: "Deliverable Title", description: "Title of the deliverable", required: false },
  { key: "invoice_amount", label: "Invoice Amount", description: "Payment amount for the invoice", required: false },
  { key: "invoice_number", label: "Invoice Number", description: "Invoice reference number", required: false },
  { key: "payment_due_date", label: "Payment Due Date", description: "Date payment is due", required: false },
  { key: "proposal_url", label: "Proposal URL", description: "Link to proposal or media kit", required: false },
  { key: "dashboard_url", label: "Dashboard URL", description: "Link to SponsorSync dashboard", required: false },
];

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function extractVariables(template: string): string[] {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(VARIABLE_PATTERN.source, "g");
  while ((match = pattern.exec(template)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

export function extractVariablesFromTemplate(subject: string | null, body: string): string[] {
  const combined = `${subject ?? ""} ${body}`;
  return extractVariables(combined);
}

export function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(VARIABLE_PATTERN, (match, key: string) => {
    if (key in variables) {
      return variables[key];
    }
    return match;
  });
}

export function validateVariables(
  template: string,
  variables: Record<string, string>
): { valid: boolean; missing: string[] } {
  const required = extractVariables(template);
  const missing = required.filter((key) => !variables[key]);
  return { valid: missing.length === 0, missing };
}

export function getVariableInfo(key: string): TemplateVariable | undefined {
  return TEMPLATE_VARIABLES.find((v) => v.key === key);
}

export function getDefaultVariableValues(): Record<string, string> {
  return TEMPLATE_VARIABLES.reduce(
    (acc, v) => {
      if (v.defaultValue) {
        acc[v.key] = v.defaultValue;
      }
      return acc;
    },
    {} as Record<string, string>
  );
}
