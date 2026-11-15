export default function AdminAdPricingLoading() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading ad pricing"
    >
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-36 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="rounded-3xl border border-white/10 bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-white/10" />
          <div className="space-y-2">
            <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="h-3.5 w-64 max-w-full animate-pulse rounded-full bg-white/5" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded-full bg-white/5" />
              <div className="h-10 animate-pulse rounded-xl bg-white/5" />
              <div className="h-3 w-full animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-surface">
        <div className="space-y-3 border-b border-white/5 p-5 sm:p-6">
          <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="h-3.5 w-60 max-w-full animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="divide-y divide-white/5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_6rem_10rem_4rem]"
            >
              <div className="h-3.5 animate-pulse rounded-full bg-white/10" />
              <div className="h-3.5 animate-pulse rounded-full bg-white/5" />
              <div className="h-3.5 animate-pulse rounded-full bg-white/5" />
              <div className="h-3.5 animate-pulse rounded-full bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
