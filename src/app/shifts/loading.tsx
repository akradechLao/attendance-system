export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 bg-gold/30 rounded-full" />
        <div>
          <div className="h-8 w-48 bg-cream-dark rounded" />
          <div className="h-4 w-56 bg-cream-dark rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold lg:col-span-1">
          <div className="h-6 w-36 bg-cream-dark rounded mb-4" />
          <div className="space-y-4">
            <div className="h-10 w-full bg-cream-dark rounded" />
            <div className="h-10 w-full bg-cream-dark rounded" />
            <div className="h-10 w-full bg-cream-dark rounded" />
            <div className="h-10 w-full bg-navy/10 rounded" />
          </div>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold lg:col-span-2">
          <div className="h-6 w-40 bg-cream-dark rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-cream/50 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
