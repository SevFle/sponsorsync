export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-2 text-gray-500">Profile, billing, and notification preferences.</p>
      <div className="mt-6 space-y-4">
        <a
          href="/dashboard/settings/billing"
          className="block rounded-lg border p-4 transition-shadow hover:shadow-md"
        >
          <h2 className="font-semibold">Billing & Subscription</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your plan, payment method, and billing details.</p>
        </a>
      </div>
    </div>
  );
}
