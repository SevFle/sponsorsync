export default async function EditSponsorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Sponsor {(await params).id}</h1>
      <p className="mt-2 text-gray-500">Update sponsor information.</p>
    </div>
  );
}
