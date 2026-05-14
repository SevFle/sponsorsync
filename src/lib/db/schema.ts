import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum, varchar, date, jsonb } from "drizzle-orm/pg-core";

export const dealStatusEnum = pgEnum("deal_status", ["draft", "active", "completed", "cancelled"]);
export const deliverableStatusEnum = pgEnum("deliverable_status", ["pending", "in_progress", "submitted", "verified", "missed"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "overdue", "cancelled"]);
export const integrationPlatformEnum = pgEnum("integration_platform", ["buzzsprout", "transistor", "anchor", "convertkit", "mailchimp"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["free", "active", "past_due", "canceled", "trialing", "paused"]);
export const verificationActionEnum = pgEnum("verification_action", ["auto_complete", "manual_review", "overdue_alert", "verification_failed", "verification_passed"]);

export const PLANS = {
  starter: { name: "Starter", price: 1900 },
  pro: { name: "Pro", price: 4900 },
} as const;

export type PlanId = keyof typeof PLANS;

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripePriceId: text("stripe_price_id"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("free").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  sponsorId: uuid("sponsor_id").references(() => sponsors.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: dealStatusEnum("status").default("draft").notNull(),
  totalValue: integer("total_value"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  contractUrl: text("contract_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const deliverables = pgTable("deliverables", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").references(() => deals.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: deliverableStatusEnum("status").default("pending").notNull(),
  dueDate: date("due_date"),
  completedDate: date("completed_date"),
  verificationData: jsonb("verification_data"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  dealId: uuid("deal_id").references(() => deals.id).notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  dueDate: date("due_date"),
  paidDate: date("paid_date"),
  invoiceUrl: text("invoice_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  platform: integrationPlatformEnum("platform").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  metadata: jsonb("metadata"),
  isConnected: boolean("is_connected").default(false).notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject"),
  body: text("body").notNull(),
  category: varchar("category", { length: 50 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  deadlineReminders: boolean("deadline_reminders").default(true).notNull(),
  paymentReminders: boolean("payment_reminders").default(true).notNull(),
  deliverableUpdates: boolean("deliverable_updates").default(true).notNull(),
  reminderDaysBefore: integer("reminder_days_before").default(3).notNull(),
  reminderSchedule: jsonb("reminder_schedule").$type<number[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationTypeEnum = pgEnum("notification_type", [
  "deadline_reminder",
  "overdue_deliverable",
  "payment_follow_up",
]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: uuid("related_id"),
  notificationKey: text("notification_key"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  expires: timestamp("expires").notNull(),
});

export const sponsorContacts = pgTable("sponsor_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sponsorId: uuid("sponsor_id").references(() => sponsors.id).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: varchar("role", { length: 100 }),
  phone: text("phone"),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const communicationStatusEnum = pgEnum("communication_status", ["sent", "delivered", "failed", "bounced"]);

export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  sponsorId: uuid("sponsor_id").references(() => sponsors.id),
  sponsorContactId: uuid("sponsor_contact_id").references(() => sponsorContacts.id),
  templateId: uuid("template_id").references(() => templates.id),
  dealId: uuid("deal_id").references(() => deals.id),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: communicationStatusEnum("status").default("sent").notNull(),
  providerId: text("provider_id"),
  to: text("to").notNull(),
  cc: text("cc"),
  bcc: text("bcc"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const verificationLogs = pgTable("verification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliverableId: uuid("deliverable_id").references(() => deliverables.id).notNull(),
  dealId: uuid("deal_id").references(() => deals.id),
  userId: uuid("user_id").references(() => users.id).notNull(),
  episodeId: text("episode_id"),
  action: verificationActionEnum("action").notNull(),
  confidence: integer("confidence").notNull(),
  placement: varchar("placement", { length: 20 }),
  keywordMatchCount: integer("keyword_match_count").default(0).notNull(),
  keywordTotalCount: integer("keyword_total_count").default(0).notNull(),
  previousStatus: deliverableStatusEnum("previous_status"),
  newStatus: deliverableStatusEnum("new_status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
