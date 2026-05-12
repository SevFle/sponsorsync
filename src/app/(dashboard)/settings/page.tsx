"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";

type Tab = "profile" | "notifications" | "integrations" | "billing";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface NotificationData {
  deadlineReminders: boolean;
  paymentReminders: boolean;
  deliverableUpdates: boolean;
  reminderDaysBefore: number;
}

interface Integration {
  id: string;
  platform: string;
  isConnected: boolean;
  lastSyncedAt: string | null;
}

interface SubscriptionData {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "notifications", label: "Notifications" },
  { key: "integrations", label: "Integrations" },
  { key: "billing", label: "Billing" },
];

const PLATFORM_LABELS: Record<string, string> = {
  buzzsprout: "Buzzsprout",
  transistor: "Transistor",
  anchor: "Anchor",
  convertkit: "ConvertKit",
  mailchimp: "Mailchimp",
};

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full max-w-md rounded-md" />
        <Skeleton className="h-10 w-full max-w-md rounded-md" />
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm font-medium text-red-800">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
        checked ? "bg-black" : "bg-gray-200"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function ProfileTab({
  profile,
  onSave,
  saving,
}: {
  profile: ProfileData;
  onSave: (name: string) => Promise<boolean>;
  saving: boolean;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setName(profile.name ?? "");
  }, [profile.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const result = profileSchema.safeParse({ name });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    const ok = await onSave(name);
    if (ok) {
      setSuccess(true);
    } else {
      setError("Failed to update profile");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="profile-name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="Your name"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-1 text-sm text-green-600">Profile updated.</p>}
      </div>

      <div>
        <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="profile-email"
          type="email"
          value={profile.email}
          readOnly
          className="mt-1 block w-full max-w-md rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

function NotificationsTab({
  preferences,
  onSave,
  saving,
}: {
  preferences: NotificationData;
  onSave: (prefs: NotificationData) => Promise<boolean>;
  saving: boolean;
}) {
  const [prefs, setPrefs] = useState<NotificationData>(preferences);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(preferences);
  }, [preferences]);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    const ok = await onSave(prefs);
    if (ok) {
      setSuccess(true);
    } else {
      setError("Failed to update preferences");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Deadline Reminders</p>
            <p className="text-xs text-gray-500">Get notified before deliverable due dates</p>
          </div>
          <Toggle
            checked={prefs.deadlineReminders}
            onChange={(val) => setPrefs((p) => ({ ...p, deadlineReminders: val }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Payment Reminders</p>
            <p className="text-xs text-gray-500">Get notified about upcoming and overdue payments</p>
          </div>
          <Toggle
            checked={prefs.paymentReminders}
            onChange={(val) => setPrefs((p) => ({ ...p, paymentReminders: val }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Deliverable Updates</p>
            <p className="text-xs text-gray-500">Get notified when deliverables are verified or updated</p>
          </div>
          <Toggle
            checked={prefs.deliverableUpdates}
            onChange={(val) => setPrefs((p) => ({ ...p, deliverableUpdates: val }))}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <label htmlFor="reminder-days" className="block text-sm font-medium text-gray-900">
            Remind me before deadline
          </label>
          <p className="text-xs text-gray-500">Number of days before a deadline to send a reminder</p>
          <input
            id="reminder-days"
            type="number"
            min={1}
            max={30}
            value={prefs.reminderDaysBefore}
            onChange={(e) =>
              setPrefs((p) => ({ ...p, reminderDaysBefore: parseInt(e.target.value, 10) || 1 }))
            }
            className="mt-2 block w-20 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Preferences updated.</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Preferences"}
      </Button>
    </div>
  );
}

function IntegrationsTab({
  integrations,
  loading,
  onDisconnect,
}: {
  integrations: Integration[];
  loading: boolean;
  onDisconnect: (platform: string) => Promise<void>;
}) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedPlatforms = new Set(integrations.filter((i) => i.isConnected).map((i) => i.platform));
  const allPlatforms = Object.entries(PLATFORM_LABELS);

  const handleDisconnect = async (platform: string) => {
    setError(null);
    setDisconnecting(platform);
    try {
      await onDisconnect(platform);
    } catch {
      setError("Failed to disconnect integration");
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-48" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Connected Platforms</h3>

      {allPlatforms.length === 0 && (
        <p className="text-sm text-gray-500">No integrations available.</p>
      )}

      <div className="space-y-2">
        {allPlatforms.map(([key, label]) => {
          const isConnected = connectedPlatforms.has(key);
          const integration = integrations.find((i) => i.platform === key);

          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                {isConnected && integration?.lastSyncedAt && (
                  <p className="text-xs text-gray-500">
                    Last synced: {new Date(integration.lastSyncedAt).toLocaleDateString()}
                  </p>
                )}
                {!isConnected && <p className="text-xs text-gray-400">Not connected</p>}
              </div>
              <div className="shrink-0">
                {isConnected ? (
                  <Button
                    variant="danger"
                    disabled={disconnecting === key}
                    onClick={() => handleDisconnect(key)}
                  >
                    {disconnecting === key ? "Disconnecting..." : "Disconnect"}
                  </Button>
                ) : (
                  <a
                    href={`/dashboard/integrations`}
                    className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Connect
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function BillingTab({ subscription }: { subscription: SubscriptionData }) {
  const planLabel = subscription.plan === "free" ? "Free" : subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
  const statusLabel = subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Plan</span>
            <span className="text-sm font-medium text-gray-900">{planLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Status</span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                subscription.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {statusLabel}
            </span>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Next billing date</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </span>
            </div>
          )}
          {subscription.cancelAtPeriodEnd && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-800">
                Your subscription will be cancelled at the end of the current billing period.
              </p>
            </div>
          )}
        </div>
      </div>

      {subscription.plan === "free" && (
        <div className="rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900">Upgrade to Pro</h3>
          <p className="mt-2 text-sm text-gray-500">
            Unlock unlimited deals, advanced reporting, and priority support.
          </p>
          <div className="mt-4">
            <Button>Upgrade Plan</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [preferences, setPreferences] = useState<NotificationData | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAllSettings = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const [profileRes, prefsRes, integrationsRes, subRes] = await Promise.all([
        apiFetch<{ profile: ProfileData }>("/api/settings/profile", { signal }),
        apiFetch<{ preferences: NotificationData }>("/api/settings/notifications", { signal }),
        apiFetch<{ integrations: Integration[] }>("/api/integrations", { signal }),
        apiFetch<{ subscription: SubscriptionData }>("/api/settings/subscription", { signal }),
      ]);

      setProfile(profileRes.profile);
      setPreferences(prefsRes.preferences);
      setIntegrations(integrationsRes.integrations);
      setSubscription(subRes.subscription);
    } catch (err) {
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (sessionStatus !== "authenticated") return;

    const controller = new AbortController();
    fetchAllSettings(controller.signal);
    return () => controller.abort();
  }, [fetchAllSettings, sessionStatus, router]);

  const handleProfileSave = async (name: string): Promise<boolean> => {
    try {
      setSaving(true);
      const result = await apiFetch<{ profile: ProfileData }>("/api/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      setProfile(result.profile);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSave = async (newPrefs: NotificationData): Promise<boolean> => {
    try {
      setSaving(true);
      const result = await apiFetch<{ preferences: NotificationData }>(
        "/api/settings/notifications",
        {
          method: "PATCH",
          body: JSON.stringify(newPrefs),
        }
      );
      setPreferences(result.preferences);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (platform: string) => {
    await apiFetch(`/api/integrations/${platform}`, { method: "DELETE" });
    setIntegrations((prev) =>
      prev.map((i) => (i.platform === platform ? { ...i, isConnected: false } : i))
    );
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" description="Profile, billing, and notification preferences." />
        <div className="mt-6">
          <SettingsSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Settings" description="Profile, billing, and notification preferences." />
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={() => fetchAllSettings()} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Profile, billing, and notification preferences." />

      <div className="mt-6">
        <nav className="mb-6 flex gap-1" aria-label="Settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          {activeTab === "profile" && profile && (
            <ProfileTab profile={profile} onSave={handleProfileSave} saving={saving} />
          )}
          {activeTab === "notifications" && preferences && (
            <NotificationsTab
              preferences={preferences}
              onSave={handleNotificationSave}
              saving={saving}
            />
          )}
          {activeTab === "integrations" && (
            <IntegrationsTab
              integrations={integrations}
              loading={false}
              onDisconnect={handleDisconnect}
            />
          )}
          {activeTab === "billing" && subscription && (
            <BillingTab subscription={subscription} />
          )}
        </div>
      </div>
    </div>
  );
}
