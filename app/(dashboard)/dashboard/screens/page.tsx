import { redirect } from "next/navigation";
import AddScreenButton from "@/components/dashboard/AddScreenButton";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { getScreens } from "@/lib/dashboard/queries";
import { createClient } from "@/lib/supabase/server";

function formatLastSeen(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function ScreensPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const screens = await getScreens(supabase, user.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Screens
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Your screens
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Pair new displays and keep an eye on every screen.
          </p>
        </div>

        <AddScreenButton customerId={user.id} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
        <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] gap-4 border-b border-white/5 px-6 py-3 text-xs font-medium uppercase tracking-[0.14em] text-white/35 md:grid">
          <span>Screen</span>
          <span>Status</span>
          <span>Last seen</span>
          <span>Location</span>
        </div>

        {screens.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-cyan-300">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <rect x="3" y="4" width="18" height="12" rx="2" />
                <path d="M8 20h8M12 16v4" />
                <path d="M12 8v4M10 10h4" />
              </svg>
            </span>
            <h2 className="mt-4 text-base font-semibold text-white">
              No screens yet
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/50">
              Add your first screen to generate a pairing code and connect it to
              your workspace.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {screens.map((screen) => (
              <li
                key={screen.id}
                className="grid gap-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-cyan-300">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <rect x="3" y="4" width="18" height="12" rx="2" />
                      <path d="M8 20h8M12 16v4" />
                    </svg>
                  </span>
                  <p className="truncate text-sm font-medium text-white">
                    {screen.name}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/35 md:hidden">
                    Status
                  </span>
                  <StatusBadge status={screen.status} />
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/35 md:hidden">
                    Last seen
                  </span>
                  <span className="text-sm text-white/60">
                    {formatLastSeen(screen.last_seen)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 md:block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/35 md:hidden">
                    Location
                  </span>
                  <span className="truncate text-sm text-white/60">
                    {screen.location ?? "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
