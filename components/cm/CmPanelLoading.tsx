export default function CmPanelLoading({
  label,
  cards = 3,
  rows = 4,
}: {
  label: string;
  cards?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label={`Loading ${label}`}>
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-48 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-white/10 bg-surface p-5"
          >
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="mt-5 h-8 w-16 animate-pulse rounded-xl bg-white/10" />
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-white/10 bg-surface p-6">
        <div className="h-5 w-40 animate-pulse rounded-full bg-white/10" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: rows }).map((_, row) => (
            <div
              key={row}
              className="h-12 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
