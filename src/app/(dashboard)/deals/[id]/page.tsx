export default function DealDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">Deal {params.id}</h1>
      <p className="mt-2 text-gray-500">Deal details and deliverables.</p>
    </div>
  );
}
