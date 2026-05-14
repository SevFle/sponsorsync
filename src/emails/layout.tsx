import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Hr,
  Preview,
  Font,
} from "react-email";

const COLORS = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  text: "#1f2937",
  textSecondary: "#6b7280",
  background: "#f9fafb",
  cardBg: "#ffffff",
  border: "#e5e7eb",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
};

export interface EmailLayoutProps {
  children: React.ReactNode;
  preview: string;
  creatorShow?: string;
}

export function EmailLayout({ children, preview, creatorShow }: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
            format: "woff2",
          }}
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: COLORS.background, fontFamily: "Inter, Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
          <Section style={{ backgroundColor: COLORS.cardBg, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
            <Section style={{ backgroundColor: COLORS.primary, padding: "32px 40px" }}>
              <Text style={{ margin: 0, color: "#ffffff", fontSize: 20, fontWeight: 700 }}>
                {creatorShow ?? "SponsorSync"}
              </Text>
            </Section>
            <Section style={{ padding: "40px" }}>
              {children}
            </Section>
          </Section>
          <Section style={{ padding: "24px 0", textAlign: "center" as const }}>
            <Text style={{ margin: 0, color: COLORS.textSecondary, fontSize: 12 }}>
              Sent via <Link href="https://sponsorsync.app" style={{ color: COLORS.primary, textDecoration: "underline" }}>SponsorSync</Link>
              {" "}— Sponsorship management for creators
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export interface HeadingProps {
  children: React.ReactNode;
}

export function EmailHeading({ children }: HeadingProps) {
  return (
    <Text style={{ margin: "0 0 24px 0", color: COLORS.text, fontSize: 24, fontWeight: 700 }}>
      {children}
    </Text>
  );
}

export interface ParagraphProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export function EmailParagraph({ children, style }: ParagraphProps) {
  return (
    <Text style={{ margin: "0 0 16px 0", color: COLORS.text, fontSize: 16, lineHeight: 1.6, ...style }}>
      {children}
    </Text>
  );
}

export interface DetailRowProps {
  label: string;
  value: string;
}

export function DetailRow({ label, value }: DetailRowProps) {
  return (
    <Row style={{ marginBottom: 12 }}>
      <Column style={{ width: "40%", paddingRight: 16 }}>
        <Text style={{ margin: 0, color: COLORS.textSecondary, fontSize: 14, fontWeight: 500 }}>
          {label}
        </Text>
      </Column>
      <Column style={{ width: "60%" }}>
        <Text style={{ margin: 0, color: COLORS.text, fontSize: 14, fontWeight: 600 }}>
          {value}
        </Text>
      </Column>
    </Row>
  );
}

export interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
}

export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Section style={{ textAlign: "center" as const, marginTop: 32, marginBottom: 32 }}>
      <Link
        href={href}
        style={{
          display: "inline-block",
          backgroundColor: COLORS.primary,
          color: "#ffffff",
          padding: "14px 32px",
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {children}
      </Link>
    </Section>
  );
}

export interface StatusBadgeProps {
  status: "info" | "warning" | "danger" | "success";
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const bgColors: Record<string, string> = {
    info: "#eff6ff",
    warning: "#fffbeb",
    danger: "#fef2f2",
    success: "#ecfdf5",
  };
  const textColors: Record<string, string> = {
    info: COLORS.primary,
    warning: COLORS.warning,
    danger: COLORS.danger,
    success: COLORS.success,
  };
  return (
    <Section style={{ display: "inline-block", backgroundColor: bgColors[status], borderRadius: 6, padding: "6px 16px", marginBottom: 24 }}>
      <Text style={{ margin: 0, color: textColors[status], fontSize: 14, fontWeight: 600 }}>
        {children}
      </Text>
    </Section>
  );
}

export function EmailDivider() {
  return <Hr style={{ margin: "24px 0", border: "none", borderTop: `1px solid ${COLORS.border}` }} />;
}

export interface FooterNoteProps {
  children: React.ReactNode;
}

export function FooterNote({ children }: FooterNoteProps) {
  return (
    <Section style={{ marginTop: 24, padding: "16px 20px", backgroundColor: COLORS.background, borderRadius: 8 }}>
      <Text style={{ margin: 0, color: COLORS.textSecondary, fontSize: 13, lineHeight: 1.5 }}>
        {children}
      </Text>
    </Section>
  );
}

export { COLORS };
