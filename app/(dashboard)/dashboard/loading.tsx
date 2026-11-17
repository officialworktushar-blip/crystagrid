export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="h-9 w-52 max-w-full animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-white/10 bg-surface p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="h-9 w-9 animate-pulse rounded-xl bg-white/5" />
            </div>
            <div className="mt-5 h-8 w-20 animate-pulse rounded-xl bg-white/10" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded-full bg-white/5" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 animate-pulse rounded-full bg-white/10" />
            <div className="h-3.5 w-56 max-w-full animate-pulse rounded-full bg-white/5" />
            <div className="h-7 w-64 max-w-full animate-pulse rounded-full bg-white/5" />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="h-5 w-36 animate-pulse rounded-full bg-white/10" />
          <div className="h-3.5 w-64 max-w-full animate-pulse rounded-full bg-white/5" />
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 border-b border-white/5 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/5" />
                <div className="h-4 w-48 animate-pulse rounded-full bg-white/10" />
                <div className="h-3 w-40 animate-pulse rounded-full bg-white/5" />
              </div>
              <div className="h-7 w-28 animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
