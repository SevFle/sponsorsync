import { interpolateTemplate, extractVariablesFromTemplate } from "@/lib/templates/templateEngine";

export interface RenderedEmail {
  html: string;
  text: string;
  subject: string;
}

export function renderEmailFromTemplate(
  subjectTemplate: string | null,
  bodyTemplate: string,
  variables: Record<string, string>
): RenderedEmail {
  const resolvedSubject = interpolateTemplate(subjectTemplate ?? "", variables);
  const resolvedHtml = interpolateTemplate(bodyTemplate, variables);
  const text = htmlToPlainText(resolvedHtml);

  return {
    html: wrapInEmailEnvelope(resolvedHtml),
    text,
    subject: resolvedSubject,
  };
}

function wrapInEmailEnvelope(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<\/th>/gi, " | ")
    .replace(/<hr[^>]*>/gi, "\n---\n")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, "$1")
    .replace(/<em[^>]*>([^<]*)<\/em>/gi, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripHandlebarsConditionals(html: string): string {
  return html
    .replace(/\{\{#if\s+\w+\}\}([\s\S]*?)\{\{\/if\}\}/g, "$1");
}
