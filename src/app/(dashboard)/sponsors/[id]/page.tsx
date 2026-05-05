export default function SponsorDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Sponsor {params.id}</h1>
      <p className="mt-2 text-gray-500">Sponsor details and deal history.</p>
    </div>
  );
}
