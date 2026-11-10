"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

const inputClass =
  "h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.session) {
        setSuccess(
          "Check your email to confirm your account, then sign in.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-white">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-6 text-body">
        Start managing your screen network from one dashboard.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label
            htmlFor="full-name"
            className="mb-2 block text-sm font-medium text-white"
          >
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="Your name"
          />
        </div>

        <div>
          <label
            htmlFor="company-name"
            className="mb-2 block text-sm font-medium text-white"
          >
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            autoComplete="organization"
            required
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="Your company"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            className={inputClass}
            placeholder="At least 8 characters"
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

        {success ? (
          <p
            role="status"
            className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100"
          >
            {success}
          </p>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full text-base"
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-body">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-sky transition duration-200 hover:text-white"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
