export default function EditSponsorPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Sponsor {params.id}</h1>
      <p className="mt-2 text-gray-500">Update sponsor information.</p>
    </div>
  );
}
