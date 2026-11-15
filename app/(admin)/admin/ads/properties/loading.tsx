export default function AdminAdPropertiesLoading() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading properties"
    >
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-52 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-56 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-full bg-white/10" />
      </div>

      <div className="grid gap-3 rounded-3xl border border-white/10 bg-surface p-5 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-xl bg-white/5"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
        <div className="hidden border-b border-white/5 bg-white/[0.02] px-5 py-3 lg:block">
          <div className="h-3 w-full animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="px-5 py-4">
              <div className="hidden grid-cols-8 items-center gap-4 lg:grid">
                {Array.from({ length: 8 }).map((_, cell) => (
                  <div
                    key={cell}
                    className="h-3.5 animate-pulse rounded-full bg-white/5"
                  />
                ))}
              </div>
              <div className="space-y-3 lg:hidden">
                <div className="h-4 w-44 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-32 animate-pulse rounded-full bg-white/5" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-8 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-8 animate-pulse rounded-lg bg-white/5" />
                  <div className="h-8 animate-pulse rounded-lg bg-white/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
