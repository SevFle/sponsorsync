export const config = {
  app: {
    name: "SponsorSync",
    url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  },
  database: {
    url: process.env.DATABASE_URL ?? "",
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET ?? "",
    url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? "",
  },
  inngest: {
    eventKey: process.env.INNGEST_EVENT_KEY ?? "",
    signingKey: process.env.INNGEST_SIGNING_KEY ?? "",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    starterPriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    proPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  },
} as const;
