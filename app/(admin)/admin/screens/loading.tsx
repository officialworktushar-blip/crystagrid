export default function AdminScreensLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading screens">
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-40 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="h-10 w-full animate-pulse rounded-full bg-white/5 xl:max-w-sm" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-9 w-20 animate-pulse rounded-full bg-white/5"
            />
          ))}
        </div>
      </div>

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
                <div className="flex justify-between gap-3">
                  <div className="h-8 w-32 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-8 w-16 animate-pulse rounded-full bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
