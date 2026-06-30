export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 bg-gold/30 rounded-full" />
        <div>
          <div className="h-8 w-56 bg-cream-dark rounded" />
          <div className="h-4 w-72 bg-cream-dark rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <div className="h-6 w-40 bg-cream-dark rounded mb-4" />
          <div className="h-10 w-full bg-cream-dark rounded mb-4" />
          <div className="h-20 w-full bg-cream/50 rounded mb-4" />
          <div className="flex gap-4">
            <div className="h-12 flex-1 bg-green-100 rounded-lg" />
            <div className="h-12 flex-1 bg-navy/10 rounded-lg" />
          </div>
        </div>
        <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
          <div className="h-6 w-32 bg-cream-dark rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-cream/50 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
