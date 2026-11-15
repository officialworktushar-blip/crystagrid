export default function AdminAdPlacesLoading() {
  return (
    <div
      className="space-y-8"
      aria-busy="true"
      aria-label="Loading places"
    >
      <div className="space-y-3">
        <div className="h-3 w-16 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-40 animate-pulse rounded-xl bg-white/10" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-white/5" />
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/10 bg-surface p-6"
        >
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 animate-pulse rounded-2xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-3 w-56 animate-pulse rounded-full bg-white/5" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="h-10 animate-pulse rounded-xl bg-white/5" />
            <div className="h-10 animate-pulse rounded-xl bg-white/5" />
            <div className="h-10 animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="mt-5 space-y-2">
            {Array.from({ length: 3 }).map((_, row) => (
              <div
                key={row}
                className="h-12 animate-pulse rounded-xl bg-white/5"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
