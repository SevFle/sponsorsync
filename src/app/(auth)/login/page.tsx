export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-8">
        <h1 className="text-2xl font-bold">Sign in to SponsorSync</h1>
        <p className="text-sm text-gray-500">
          Automated sponsorship tracking for solo creators.
        </p>
        <button className="w-full rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-gray-800">
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
