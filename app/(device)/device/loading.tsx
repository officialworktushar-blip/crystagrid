export default function DeviceOverviewLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading overview">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-48 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-3xl border border-white/5 bg-surface"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl border border-white/5 bg-surface" />
      <span className="sr-only">Loading overview...</span>
    </div>
  );
}
