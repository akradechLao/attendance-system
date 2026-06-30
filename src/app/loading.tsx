export default function Loading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-1.5 bg-gold/30 rounded-full" />
        <div>
          <div className="h-8 w-48 bg-cream-dark rounded" />
          <div className="h-4 w-64 bg-cream-dark rounded mt-2" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-cream-dark bg-white p-6 shadow-gold">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 bg-cream-dark rounded" />
                <div className="h-8 w-16 bg-cream-dark rounded" />
              </div>
              <div className="h-12 w-12 bg-cream-dark rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-cream-dark bg-white shadow-gold overflow-hidden">
        <div className="gradient-navy px-6 py-4">
          <div className="h-5 w-40 bg-white/20 rounded" />
        </div>
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-cream/50 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
