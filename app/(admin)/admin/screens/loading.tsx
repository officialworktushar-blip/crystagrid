export default function AdminScreensLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading screens">
      <div className="space-y-2">
        <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>
      <div className="h-12 animate-pulse rounded-full bg-white/5" />
      <div className="h-96 animate-pulse rounded-3xl border border-white/5 bg-surface" />
      <span className="sr-only">Loading screens...</span>
    </div>
  );
}
