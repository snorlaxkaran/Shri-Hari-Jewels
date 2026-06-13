export default function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-6 w-40 rounded bg-zinc-200" />
        <div className="h-4 w-64 rounded bg-zinc-100 mt-2" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white border border-zinc-200" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-white border border-zinc-200" />
    </div>
  );
}
