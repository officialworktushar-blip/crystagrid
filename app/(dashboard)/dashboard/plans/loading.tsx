export default function PlansLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading plans">
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-9 w-40 max-w-full animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-3xl border border-white/10 bg-surface"
          >
            <div className="border-b border-white/5 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-white/5" />
                  <div className="h-5 w-44 animate-pulse rounded-full bg-white/10" />
                  <div className="h-3 w-32 animate-pulse rounded-full bg-white/5" />
                </div>
                <div className="h-7 w-24 animate-pulse rounded-full bg-white/5" />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((__, statIndex) => (
                  <div
                    key={statIndex}
                    className="rounded-2xl border border-white/5 bg-white/[0.025] px-3.5 py-3"
                  >
                    <div className="h-2.5 w-20 animate-pulse rounded-full bg-white/5" />
                    <div className="mt-2 h-4 w-28 animate-pulse rounded-full bg-white/10" />
                    <div className="mt-1.5 h-2.5 w-16 animate-pulse rounded-full bg-white/5" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
                <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                  {Array.from({ length: 2 }).map((___, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="h-3.5 w-36 animate-pulse rounded-full bg-white/10" />
                        <div className="h-3 w-28 animate-pulse rounded-full bg-white/5" />
                      </div>
                      <div className="h-3.5 w-16 animate-pulse rounded-full bg-white/5" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-3 w-32 animate-pulse rounded-full bg-white/5 sm:ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
