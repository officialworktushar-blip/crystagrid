export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Screens
        </p>
        <div className="mt-3 h-8 w-64 animate-pulse rounded-xl bg-white/5" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-lg bg-white/5" />
        <p className="mt-4 text-xs text-muted">Loading screens</p>
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="space-y-4 rounded-3xl border border-white/10 bg-surface p-6"
          >
            <div className="h-5 w-48 animate-pulse rounded-lg bg-white/5" />
            <div className="h-3 w-64 max-w-full animate-pulse rounded-lg bg-white/5" />
            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <div className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
              <div className="h-20 animate-pulse rounded-2xl bg-white/[0.03]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
