"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40";

function resolveSafeNext(value: string | null): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("://")
  ) {
    return null;
  }

  return value;
}

function LoginFallback() {
  return <div aria-hidden="true" className="min-h-[430px]" />;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const registerHref = nextParam
    ? `/register?next=${encodeURIComponent(nextParam)}`
    : "/register";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const safeNext = resolveSafeNext(nextParam);
      let destination = "/dashboard";

      if (signInData.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", signInData.user.id)
          .maybeSingle();
        const profile = profileData as { role?: string } | null;

        if (profile?.role === "admin") {
          destination = "/admin";
        } else if (profile?.role === "manager") {
          destination = "/manage";
        } else if (profile?.role === "customer" && safeNext) {
          destination = safeNext;
        }
      }

      router.push(destination);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-white">
        Welcome back
      </h1>
      <p className="mt-2 text-sm leading-6 text-body">
        Sign in to manage your screens and content.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-white"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-white"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="Your password"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full text-base"
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        Don&apos;t have an account?{" "}
        <Link
          href={registerHref}
          className="font-medium text-brand-sky transition duration-200 hover:text-white"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
