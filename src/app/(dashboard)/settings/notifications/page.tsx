"use client";

import { useState, useEffect } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

interface NotificationPreferences {
  deadlineReminders: boolean;
  paymentReminders: boolean;
  deliverableUpdates: boolean;
  reminderDaysBefore: number;
  reminderSchedule: number[] | null;
}

const DEFAULT_SCHEDULE = [7, 3, 1];

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scheduleInput, setScheduleInput] = useState("");

  useEffect(() => {
    fetchPreferences();
  }, []);

  async function fetchPreferences() {
    try {
      const data = await apiFetch<{ preferences: NotificationPreferences }>("/api/settings/notifications");
      if (data.preferences) {
        setPrefs(data.preferences);
        setScheduleInput(
          data.preferences.reminderSchedule?.join(", ") ?? DEFAULT_SCHEDULE.join(", ")
        );
      }
    } catch {
      setMessage({ type: "error", text: "Failed to load preferences" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    setMessage(null);

    const scheduleParts = scheduleInput
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 30);

    try {
      const data = await apiFetch<{ preferences: NotificationPreferences }>("/api/settings/notifications", {
        method: "PUT",
        body: JSON.stringify({
          ...prefs,
          reminderSchedule: scheduleParts.length > 0 ? scheduleParts : undefined,
        }),
      });

      setPrefs(data.preferences);
      setMessage({ type: "success", text: "Preferences saved" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to save preferences",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="mt-2 text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Notification Settings</h1>
      <p className="mt-2 text-gray-500">
        Configure how and when you receive deadline reminders and notifications.
      </p>

      {message && (
        <div
          className={`mt-4 rounded-lg border p-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {prefs && (
        <div className="mt-6 space-y-6">
          <section className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Reminder Types</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose which notifications you want to receive.
            </p>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.deadlineReminders}
                  onChange={(e) =>
                    setPrefs({ ...prefs, deadlineReminders: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <div className="font-medium">Deadline Reminders</div>
                  <div className="text-sm text-gray-500">
                    Get notified when deliverable deadlines are approaching.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.paymentReminders}
                  onChange={(e) =>
                    setPrefs({ ...prefs, paymentReminders: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <div className="font-medium">Payment Reminders</div>
                  <div className="text-sm text-gray-500">
                    Get notified about overdue and upcoming payments.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={prefs.deliverableUpdates}
                  onChange={(e) =>
                    setPrefs({ ...prefs, deliverableUpdates: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <div>
                  <div className="font-medium">Deliverable Updates</div>
                  <div className="text-sm text-gray-500">
                    Get notified about deliverable verification results and status changes.
                  </div>
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold">Reminder Schedule</h2>
            <p className="mt-1 text-sm text-gray-500">
              Customize when you receive deadline reminder emails. Enter days before the
              deadline, separated by commas (e.g., &quot;7, 3, 1&quot;).
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Reminder days (comma-separated)
              </label>
              <input
                type="text"
                value={scheduleInput}
                onChange={(e) => setScheduleInput(e.target.value)}
                placeholder="7, 3, 1"
                className="mt-1 block w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Between 1-5 tiers, each between 1-30 days. Default: 7, 3, 1
              </p>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
