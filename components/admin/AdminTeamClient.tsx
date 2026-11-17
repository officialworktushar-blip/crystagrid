"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Phone, UsersRound } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { managerDisplayName, type AdminTeamMember } from "@/lib/admin";
import { isRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notice = {
  type: "success" | "error";
  message: string;
};

type StaffRole = Exclude<Role, "admin" | "customer">;

const STAFF_ROLES: { value: StaffRole; label: string }[] = [
  { value: "manager", label: ROLE_LABELS.manager },
  { value: "device_manager", label: ROLE_LABELS.device_manager },
  { value: "sales_manager", label: ROLE_LABELS.sales_manager },
];

const CUSTOMER_OPTION = {
  value: "customer",
  label: "Customer (remove staff role)",
} as const;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  ...STAFF_ROLES,
  CUSTOMER_OPTION,
];

const selectClass =
  "h-11 w-full cursor-pointer rounded-2xl border border-white/10 bg-surface-2 px-4 text-sm text-white outline-none transition focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 [&>option]:bg-surface-2";

function RoleChip({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        role === "admin"
          ? "border-sky-400/30 bg-sky-400/10 text-sky-200"
          : role === "manager"
            ? "border-blue-400/30 bg-blue-400/10 text-blue-200"
            : "border-white/10 bg-white/5 text-white/70",
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export default function AdminTeamClient({
  managers,
  currentUserId,
  loadError,
}: {
  managers: AdminTeamMember[];
  currentUserId: string | null;
  loadError: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("manager");
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmail = email.trim();
    setNotice(null);

    if (!nextEmail) {
      setNotice({ type: "error", message: "Enter an email address." });
      return;
    }

    setAdding(true);

    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_role", {
      p_email: nextEmail,
      p_role: role,
    });

    setAdding(false);

    if (error) {
      setNotice({ type: "error", message: error.message });
      return;
    }

    setEmail("");
    setNotice({
      type: "success",
      message: `${ROLE_LABELS[role]} role granted.`,
    });
    router.refresh();
  }

  async function handleRoleChange(member: AdminTeamMember, nextRole: Role) {
    if (nextRole === member.role) {
      return;
    }

    const label =
      nextRole === "customer" ? CUSTOMER_OPTION.label : ROLE_LABELS[nextRole];
    const confirmed = window.confirm(
      `Change the role of "${managerDisplayName(member)}" to ${label}?`,
    );

    if (!confirmed) {
      return;
    }

    if (!member.email) {
      setNotice({
        type: "error",
        message: "This team member does not have an email address.",
      });
      return;
    }

    setUpdatingId(member.id);
    setNotice(null);

    const supabase = createClient();
    const { error } = await supabase.rpc("admin_set_role", {
      p_email: member.email,
      p_role: nextRole,
    });

    setUpdatingId(null);

    if (error) {
      setNotice({ type: "error", message: error.message });
      return;
    }

    setNotice({
      type: "success",
      message: `${managerDisplayName(member)} is now ${ROLE_LABELS[nextRole]}.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {notice ? (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.type === "error"
              ? "border-red-400/20 bg-red-400/10 text-red-200"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
          )}
        >
          {notice.message}
        </p>
      ) : null}

      <Card className="p-5 hover:border-white/10 hover:shadow-none sm:p-6">
        <div className="flex items-start gap-4">
          <span className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-brand">
            <UsersRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Add team member
            </h2>
            <p className="mt-1 text-sm text-body">
              Grant a role to a registered account.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAdd}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="team-email" className="sr-only">
              Email address
            </label>
            <input
              id="team-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              autoComplete="email"
              className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40"
            />
          </div>
          <div className="min-w-0 sm:w-56">
            <label htmlFor="team-role" className="sr-only">
              Role
            </label>
            <select
              id="team-role"
              value={role}
              onChange={(event) => {
                const nextRole = event.target.value;
                if (isRole(nextRole) && nextRole !== "admin" && nextRole !== "customer") {
                  setRole(nextRole);
                }
              }}
              className={selectClass}
            >
              {STAFF_ROLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={adding} className="shrink-0 sm:h-11">
            {adding ? "Adding..." : "Add team member"}
          </Button>
        </form>

        <p className="mt-3 text-xs text-muted">
          The person must register on the site first.
        </p>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Team members
          </h2>
          <p className="mt-1 text-sm text-body">
            {managers.length}{" "}
            {managers.length === 1 ? "team member" : "team members"}.
          </p>
        </div>

        {loadError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            Team members could not be loaded. {loadError}
          </p>
        ) : null}

        {managers.length === 0 ? (
          loadError ? null : (
            <Card className="p-8 text-center hover:border-white/10 hover:shadow-none">
              <p className="text-sm font-medium text-white">
                No team members yet.
              </p>
              <p className="mt-1 text-sm text-body">
                Use the form above to add a registered account.
              </p>
            </Card>
          )
        ) : (
          <Card className="overflow-hidden p-0 hover:border-white/10 hover:shadow-none">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[56rem] text-left text-sm">
                <thead className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Member
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Phone
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Customers
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {managers.map((member) => {
                    const canChangeRole =
                      member.role !== "admin" && member.id !== currentUserId;

                    return (
                      <tr
                        key={member.id}
                        className="transition duration-200 hover:bg-white/[0.03]"
                      >
                        <td className="max-w-[20rem] px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-white">
                              {managerDisplayName(member)}
                            </p>
                            <RoleChip role={member.role} />
                            {currentUserId === member.id ? (
                              <span className="text-[10px] text-muted">You</span>
                            ) : null}
                          </div>
                          {member.email ? (
                            <a
                              href={`mailto:${member.email}`}
                              className="mt-0.5 block truncate text-xs text-brand-sky transition duration-200 hover:text-white"
                            >
                              {member.email}
                            </a>
                          ) : (
                            <p className="mt-0.5 text-xs text-muted">No email</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-white/70">
                          {member.phone || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-white/70 tabular-nums">
                          {member.role === "manager"
                            ? member.customers_count
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {member.role === "manager" ? (
                              <Link
                                href={`/admin/customers?manager=${member.id}`}
                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                              >
                                View customers
                                <ArrowRight
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5"
                                />
                              </Link>
                            ) : null}
                            {canChangeRole ? (
                              <select
                                aria-label={`Change role for ${managerDisplayName(member)}`}
                                value={member.role}
                                disabled={updatingId === member.id}
                                onChange={(event) => {
                                  const nextRole = event.target.value;
                                  if (isRole(nextRole)) {
                                    void handleRoleChange(member, nextRole);
                                  }
                                }}
                                className={cn(
                                  selectClass,
                                  "h-9 max-w-[15rem] px-3 text-xs disabled:opacity-50",
                                )}
                              >
                                {ROLE_OPTIONS.map((option) => (
                                  <option
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-white/5 lg:hidden">
              {managers.map((member) => {
                const canChangeRole =
                  member.role !== "admin" && member.id !== currentUserId;

                return (
                  <div key={member.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {managerDisplayName(member)}
                          </p>
                          <RoleChip role={member.role} />
                          {currentUserId === member.id ? (
                            <span className="text-[10px] text-muted">You</span>
                          ) : null}
                        </div>
                        {member.email ? (
                          <a
                            href={`mailto:${member.email}`}
                            className="mt-0.5 block truncate text-xs text-brand-sky transition duration-200 hover:text-white"
                          >
                            {member.email}
                          </a>
                        ) : null}
                        {member.phone ? (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                            <Phone aria-hidden="true" className="h-3.5 w-3.5" />
                            {member.phone}
                          </p>
                        ) : null}
                      </div>
                      {member.role === "manager" ? (
                        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/60 tabular-nums">
                          {member.customers_count}{" "}
                          {member.customers_count === 1
                            ? "customer"
                            : "customers"}
                        </span>
                      ) : null}
                    </div>

                    {canChangeRole ? (
                      <div className="mt-3">
                        <label
                          htmlFor={`role-${member.id}`}
                          className="mb-1.5 block text-xs text-muted"
                        >
                          Role
                        </label>
                        <select
                          id={`role-${member.id}`}
                          value={member.role}
                          disabled={updatingId === member.id}
                          onChange={(event) => {
                            const nextRole = event.target.value;
                            if (isRole(nextRole)) {
                              void handleRoleChange(member, nextRole);
                            }
                          }}
                          className={cn(selectClass, "text-xs disabled:opacity-50")}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {member.role === "manager" ? (
                      <div className="mt-3">
                        <Link
                          href={`/admin/customers?manager=${member.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-brand-sky transition duration-200 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                        >
                          View customers
                          <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </section>
    </div>
  );
}
