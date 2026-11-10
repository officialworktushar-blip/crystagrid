export default function AdminCustomerDetailLoading() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading customer details"
    >
      <div className="space-y-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/5" />
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-7 w-52 max-w-full animate-pulse rounded-xl bg-white/10" />
            <div className="h-3.5 w-32 animate-pulse rounded-full bg-white/5" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-surface p-5">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-16 animate-pulse rounded-full bg-white/5" />
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="h-3 w-40 animate-pulse rounded-full bg-white/5" />
        <div className="divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10 bg-surface">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-16 animate-pulse rounded-full bg-white/10" />
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
                  <div className="h-3 w-28 animate-pulse rounded-full bg-white/5" />
                </div>
              </div>
              <div className="h-8 w-16 animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="divide-y divide-white/5 overflow-hidden rounded-3xl border border-white/10 bg-surface xl:col-span-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 px-4 py-4"
            >
              <div className="space-y-2">
                <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-white/5" />
              </div>
              <div className="h-6 w-14 animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-white/10 bg-surface"
            >
              <div className="aspect-video animate-pulse bg-white/5" />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-32 max-w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-16 animate-pulse rounded-full bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
