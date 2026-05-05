export function Sidebar() {
  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/deals", label: "Deals" },
    { href: "/dashboard/sponsors", label: "Sponsors" },
    { href: "/dashboard/deliverables", label: "Deliverables" },
    { href: "/dashboard/payments", label: "Payments" },
    { href: "/dashboard/templates", label: "Templates" },
    { href: "/dashboard/integrations", label: "Integrations" },
    { href: "/dashboard/settings", label: "Settings" },
  ];

  return (
    <nav className="w-64 border-r bg-gray-50 p-4">
      <h2 className="mb-6 text-lg font-bold">SponsorSync</h2>
      <ul className="space-y-2 text-sm">
        {navItems.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="block rounded px-3 py-2 hover:bg-gray-200"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
