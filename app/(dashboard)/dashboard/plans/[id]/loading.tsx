export default function Loading() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-sky">
          My Plans
        </p>
        <div className="mt-3 h-8 w-64 animate-pulse rounded-xl bg-white/5" />
        <p className="mt-4 text-xs text-muted">Loading booking</p>
      </div>
      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-surface p-6">
          <div className="h-4 w-40 animate-pulse rounded-lg bg-white/5" />
          <div className="mt-4 h-8 w-72 max-w-full animate-pulse rounded-xl bg-white/5" />
          <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-2xl bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-48 animate-pulse rounded-3xl border border-white/10 bg-surface" />
          <div className="h-48 animate-pulse rounded-3xl border border-white/10 bg-surface" />
        </div>
      </div>
    </div>
  );
}
