export default function EditDealPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Deal {params.id}</h1>
      <p className="mt-2 text-gray-500">Update deal details.</p>
    </div>
  );
}
