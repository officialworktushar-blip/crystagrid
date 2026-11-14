"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatAdminDate } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminLeadsClient({
  leads,
  loadError,
}: {
  leads: Lead[];
  loadError: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visibleLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return leads;
    }

    return leads.filter((lead) =>
      [
        lead.name,
        lead.email,
        lead.phone,
        lead.company,
        lead.message,
      ].some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [leads, query]);

  async function handleDelete(lead: Lead) {
    const confirmed = window.confirm(
      `Delete the lead from "${lead.name}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(lead.id);
    setDeleteError(null);

    const supabase = createClient();
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);

    if (error) {
      setDeleteError(error.message);
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-sm">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, or message"
          aria-label="Search leads"
          className="h-10 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
        />
      </div>

      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          Leads could not be loaded. {loadError}
        </p>
      ) : null}

      {deleteError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          The lead could not be deleted. {deleteError}
        </p>
      ) : null}

      {visibleLeads.length === 0 ? (
        <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
          <p className="text-sm font-medium text-white">
            {leads.length === 0
              ? "No leads yet."
              : "No leads match your search."}
          </p>
          <p className="mt-1 text-sm text-body">
            {leads.length === 0
              ? "Messages from the contact form will appear here."
              : "Try a different name, email, company, or message."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[72rem] text-left text-sm">
              <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Phone
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Message
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="transition duration-200 hover:bg-white/[0.03]"
                  >
                    <td className="max-w-[12rem] px-5 py-3.5">
                      <p className="truncate font-semibold text-white">
                        {lead.name}
                      </p>
                    </td>
                    <td className="max-w-[15rem] px-4 py-3.5">
                      <a
                        href={`mailto:${lead.email}`}
                        className="block truncate text-brand-sky transition duration-200 hover:text-white"
                      >
                        {lead.email}
                      </a>
                    </td>
                    <td className="px-4 py-3.5 text-white/70">
                      {lead.phone || "—"}
                    </td>
                    <td className="max-w-[12rem] px-4 py-3.5 text-white/70">
                      <span className="block truncate">
                        {lead.company || "—"}
                      </span>
                    </td>
                    <td className="max-w-[22rem] px-4 py-3.5 text-white/70">
                      <p
                        className="line-clamp-2 break-words"
                        title={lead.message}
                      >
                        {lead.message}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-white/60">
                      {formatAdminDate(lead.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(lead)}
                        disabled={deletingId === lead.id}
                        className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                      >
                        {deletingId === lead.id ? "Deleting..." : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-white/5 lg:hidden">
            {visibleLeads.map((lead) => (
              <div key={lead.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {lead.name}
                    </p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="mt-0.5 block truncate text-xs text-brand-sky transition duration-200 hover:text-white"
                    >
                      {lead.email}
                    </a>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {[lead.phone, lead.company]
                        .filter(Boolean)
                        .join(" · ") || "No phone or company"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {formatAdminDate(lead.created_at)}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 break-words text-sm leading-6 text-body">
                  {lead.message}
                </p>

                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(lead)}
                    disabled={deletingId === lead.id}
                    className="h-8 px-3 text-xs text-red-300 hover:bg-red-400/10 hover:text-red-200"
                  >
                    {deletingId === lead.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <p
        className={cn(
          "text-xs text-muted",
          visibleLeads.length === 0 && "sr-only",
        )}
      >
        Showing {visibleLeads.length} of {leads.length} leads.
      </p>
    </div>
  );
}
