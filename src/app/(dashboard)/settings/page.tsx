"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "notifications";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface NotificationPrefs {
  deadlineReminders: boolean;
  paymentReminders: boolean;
  deliverableUpdates: boolean;
  reminderDaysBefore: number;
}

interface SettingsData {
  profile: Profile;
  notificationPreferences: NotificationPrefs;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-blue-500" : "bg-gray-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

export default function SettingsPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<SettingsData>("/api/settings", { signal });
      setProfile(data.profile);
      setNotifications(data.notificationPreferences);
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
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, [fetchSettings, sessionStatus, router]);

  const handleProfileSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setSaveSuccess(false);
      await apiFetch<Profile>("/api/settings/profile", {
        method: "PUT",
        body: JSON.stringify({ name: profile.name, image: profile.image }),
      });
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    if (!notifications) return;
    try {
      setSaving(true);
      setSaveSuccess(false);
      await apiFetch<NotificationPrefs>("/api/settings/notifications", {
        method: "PUT",
        body: JSON.stringify(notifications),
      });
      setSaveSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save notifications");
    } finally {
      setSaving(false);
    }
  };

  if (sessionStatus !== "authenticated") {
    return null;
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Settings" description="Profile, billing, and notification preferences." />
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-10 w-64 rounded bg-gray-200" />
          <div className="h-40 rounded-lg border border-gray-200 bg-gray-100" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div>
        <PageHeader title="Settings" description="Profile, billing, and notification preferences." />
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button
            onClick={() => fetchSettings()}
            className="mt-2 inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" description="Profile, billing, and notification preferences." />

      <div className="mt-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab("profile"); setSaveSuccess(false); setError(null); }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "profile"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Profile
          </button>
          <button
            onClick={() => { setActiveTab("notifications"); setSaveSuccess(false); setError(null); }}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "notifications"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Notifications
          </button>
        </div>

        <div className="mt-6">
          {activeTab === "profile" && profile && (
            <div className="space-y-4">
              {saveSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Profile saved successfully.
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="mt-1 w-full max-w-md rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={profile.name ?? ""}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="mt-1 w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleProfileSave}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          )}

          {activeTab === "notifications" && notifications && (
            <div className="space-y-4">
              {saveSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  Notification preferences saved.
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {error}
                </div>
              )}
              <div className="max-w-md space-y-3">
                <Toggle
                  label="Deadline Reminders"
                  checked={notifications.deadlineReminders}
                  onChange={(val) =>
                    setNotifications({ ...notifications, deadlineReminders: val })
                  }
                />
                <Toggle
                  label="Payment Reminders"
                  checked={notifications.paymentReminders}
                  onChange={(val) =>
                    setNotifications({ ...notifications, paymentReminders: val })
                  }
                />
                <Toggle
                  label="Deliverable Updates"
                  checked={notifications.deliverableUpdates}
                  onChange={(val) =>
                    setNotifications({ ...notifications, deliverableUpdates: val })
                  }
                />
              </div>
              <div className="max-w-md">
                <label htmlFor="reminderDays" className="block text-sm font-medium text-gray-700">
                  Remind me this many days before a deadline
                </label>
                <input
                  id="reminderDays"
                  type="number"
                  min={1}
                  max={30}
                  value={notifications.reminderDaysBefore}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      reminderDaysBefore: parseInt(e.target.value, 10) || 3,
                    })
                  }
                  className="mt-1 w-20 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleNotificationsSave}
                disabled={saving}
                className="inline-flex items-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Notifications"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
