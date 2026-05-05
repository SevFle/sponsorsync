import type { ShipmentEmailData, TenantBranding, EmailContent } from "./types";

export function brandedFooter(branding?: TenantBranding): string {
  const companyName = branding?.companyName ?? "ShipLens";
  return `${companyName} Tracking Notification`;
}

export function brandedTrackingUrl(
  trackingId: string,
  branding?: TenantBranding
): string {
  if (branding?.trackingBaseUrl) {
    const base = branding.trackingBaseUrl.replace(/\/+$/, "");
    return `${base}/${trackingId}`;
  }
  return "#";
}

export function brandedLogoHtml(branding?: TenantBranding): string {
  if (branding?.logoUrl) {
    return `<img src="${branding.logoUrl}" alt="${branding.companyName ?? "ShipLens"}" style="max-height: 40px; margin-bottom: 8px;" />`;
  }
  return "";
}

function infoRow(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${label}</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${value}</td></tr>`;
}

export function buildEmailHtml(params: {
  headerColor: string;
  headerTitle: string;
  bodyHtml: string;
  data: ShipmentEmailData;
  branding?: TenantBranding;
  showTrackButton?: boolean;
  alertHtml?: string;
}): string {
  const {
    headerColor,
    headerTitle,
    bodyHtml,
    data,
    branding,
    showTrackButton = false,
    alertHtml,
  } = params;

  const logo = brandedLogoHtml(branding);
  const trackingUrl = brandedTrackingUrl(data.trackingId, branding);
  const footer = brandedFooter(branding);

  const tableRows = [
    infoRow("From", data.origin),
    infoRow("To", data.destination),
    data.estimatedDelivery
      ? infoRow("Est. Delivery", data.estimatedDelivery)
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const trackButton = showTrackButton
    ? `<a href="${trackingUrl}" style="display: inline-block; background: ${headerColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Track Your Shipment</a>`
    : "";

  const alertBlock = alertHtml
    ? `<div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 12px; margin: 16px 0;">
      ${alertHtml}
    </div>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  ${logo ? `<div style="text-align: center; margin-bottom: 12px;">${logo}</div>` : ""}
  <div style="background: ${headerColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">${headerTitle}</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
    ${bodyHtml}
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      ${tableRows}
    </table>
    ${alertBlock}
    ${trackButton}
  </div>
  <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">${footer}</p>
</body>
</html>`;
}

export function buildEmailText(params: {
  lines: string[];
  data: ShipmentEmailData;
  branding?: TenantBranding;
}): string {
  const { lines, data, branding } = params;
  const footer = brandedFooter(branding);

  const detailLines = [
    `From: ${data.origin}`,
    `To: ${data.destination}`,
    data.estimatedDelivery ? `Est. Delivery: ${data.estimatedDelivery}` : "",
  ].filter(Boolean);

  return [...lines, "", ...detailLines, "", footer]
    .filter(Boolean)
    .join("\n");
}
