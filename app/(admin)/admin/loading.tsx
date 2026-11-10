export default function AdminOverviewLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading admin overview">
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-44 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-white/10 bg-surface p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-white/5" />
            </div>
            <div className="mt-4 h-7 w-24 animate-pulse rounded-lg bg-white/10" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl border border-white/10 bg-surface"
          >
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div className="h-4 w-36 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-white/5" />
            </div>
            <div className="divide-y divide-white/5">
              {Array.from({ length: 5 }).map((_, row) => (
                <div
                  key={row}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3.5 w-40 max-w-full animate-pulse rounded-full bg-white/10" />
                    <div className="h-3 w-28 max-w-full animate-pulse rounded-full bg-white/5" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
