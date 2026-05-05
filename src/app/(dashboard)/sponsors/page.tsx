export default function SponsorsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sponsors</h1>
        <a href="/dashboard/sponsors/new" className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
          New Sponsor
        </a>
      </div>
      <p className="mt-2 text-gray-500">Manage your sponsor contacts.</p>
    </div>
  );
}
