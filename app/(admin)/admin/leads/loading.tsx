export default function AdminLeadsLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading leads">
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-32 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="h-10 w-full animate-pulse rounded-full bg-white/5 sm:max-w-sm" />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
        <div className="hidden border-b border-white/5 bg-white/[0.02] px-5 py-3 lg:block">
          <div className="h-3 w-full animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="px-5 py-4">
              <div className="hidden grid-cols-6 items-center gap-4 lg:grid">
                {Array.from({ length: 6 }).map((_, cell) => (
                  <div
                    key={cell}
                    className="h-3.5 animate-pulse rounded-full bg-white/5"
                  />
                ))}
              </div>
              <div className="space-y-3 lg:hidden">
                <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-28 animate-pulse rounded-full bg-white/5" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
