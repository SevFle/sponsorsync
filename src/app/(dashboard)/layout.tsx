import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/providers/auth-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AuthProvider>
      <div className="flex min-h-screen">
        <nav className="w-64 border-r bg-gray-50 p-4">
          <h2 className="mb-6 text-lg font-bold">SponsorSync</h2>
          <ul className="space-y-2 text-sm">
            <li><a href="/dashboard" className="block rounded px-3 py-2 hover:bg-gray-200">Dashboard</a></li>
            <li><a href="/dashboard/deals" className="block rounded px-3 py-2 hover:bg-gray-200">Deals</a></li>
            <li><a href="/dashboard/sponsors" className="block rounded px-3 py-2 hover:bg-gray-200">Sponsors</a></li>
            <li><a href="/dashboard/deliverables" className="block rounded px-3 py-2 hover:bg-gray-200">Deliverables</a></li>
            <li><a href="/dashboard/payments" className="block rounded px-3 py-2 hover:bg-gray-200">Payments</a></li>
            <li><a href="/dashboard/templates" className="block rounded px-3 py-2 hover:bg-gray-200">Templates</a></li>
            <li><a href="/dashboard/integrations" className="block rounded px-3 py-2 hover:bg-gray-200">Integrations</a></li>
            <li><a href="/dashboard/settings" className="block rounded px-3 py-2 hover:bg-gray-200">Settings</a></li>
          </ul>
        </nav>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </AuthProvider>
  );
}
