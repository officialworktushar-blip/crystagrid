"use client";

import { useRef, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

const NAME_MAX = 100;
const EMAIL_MAX = 200;
const PHONE_MAX = 30;
const COMPANY_MAX = 150;
const MESSAGE_MAX = 2000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "h-12 w-full rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60";

const labelClass = "mb-2 block text-sm font-medium text-white";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setMessage("");
    setWebsite("");
    setError(null);
    setSubmitted(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    setError(null);

    if (website.trim()) {
      setSubmitted(true);
      return;
    }

    const nameValue = name.trim();
    const emailValue = email.trim();
    const phoneValue = phone.trim();
    const companyValue = company.trim();
    const messageValue = message.trim();

    if (!nameValue) {
      setError("Please enter your name.");
      return;
    }

    if (nameValue.length > NAME_MAX) {
      setError(`Name must be ${NAME_MAX} characters or fewer.`);
      return;
    }

    if (!emailValue) {
      setError("Please enter your email address.");
      return;
    }

    if (emailValue.length > EMAIL_MAX) {
      setError(`Email must be ${EMAIL_MAX} characters or fewer.`);
      return;
    }

    if (!EMAIL_PATTERN.test(emailValue)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (phoneValue.length > PHONE_MAX) {
      setError(`Phone must be ${PHONE_MAX} characters or fewer.`);
      return;
    }

    if (companyValue.length > COMPANY_MAX) {
      setError(`Company must be ${COMPANY_MAX} characters or fewer.`);
      return;
    }

    if (!messageValue) {
      setError("Please enter a message.");
      return;
    }

    if (messageValue.length > MESSAGE_MAX) {
      setError(`Message must be ${MESSAGE_MAX} characters or fewer.`);
      return;
    }

    setSending(true);
    submittingRef.current = true;

    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("leads").insert({
        name: nameValue,
        email: emailValue,
        phone: phoneValue || null,
        company: companyValue || null,
        message: messageValue,
      });

      if (insertError) {
        setError(
          "We couldn't send your message. Please try again or email hello@crystagrid.com.",
        );
        return;
      }

      setSubmitted(true);
    } catch {
      setError(
        "We couldn't send your message. Please try again or email hello@crystagrid.com.",
      );
    } finally {
      submittingRef.current = false;
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <Card className="p-0 hover:border-white/10 hover:shadow-none">
        <div
          role="status"
          className="flex flex-col items-center px-6 py-14 text-center sm:px-10"
        >
          <span className="brand-gradient flex h-12 w-12 items-center justify-center rounded-full shadow-brand">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 text-white"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          <h3 className="mt-5 text-xl font-bold tracking-tight text-white">
            Message sent
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-6 text-body">
            Thanks for reaching out. Our team will get back to you within one
            business day.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-6"
            onClick={resetForm}
          >
            Send another message
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:border-white/10 hover:shadow-none sm:p-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative space-y-5"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className={labelClass}>
              Name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={NAME_MAX}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={sending}
              className={inputClass}
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className={labelClass}>
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={EMAIL_MAX}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={sending}
              className={inputClass}
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="contact-phone" className={labelClass}>
              Phone{" "}
              <span className="text-xs font-normal text-muted">(optional)</span>
            </label>
            <input
              id="contact-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={PHONE_MAX}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={sending}
              className={inputClass}
              placeholder="+91 00000 00000"
            />
          </div>

          <div>
            <label htmlFor="contact-company" className={labelClass}>
              Company{" "}
              <span className="text-xs font-normal text-muted">(optional)</span>
            </label>
            <input
              id="contact-company"
              name="company"
              type="text"
              autoComplete="organization"
              maxLength={COMPANY_MAX}
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              disabled={sending}
              className={inputClass}
              placeholder="Your company"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="contact-message"
              className="block text-sm font-medium text-white"
            >
              Message
            </label>
            <span className="text-xs text-muted tabular-nums">
              {message.length}/{MESSAGE_MAX}
            </span>
          </div>
          <textarea
            id="contact-message"
            name="message"
            required
            maxLength={MESSAGE_MAX}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={sending}
            className="min-h-32 w-full resize-y rounded-3xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white outline-none transition placeholder:text-muted focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/40 disabled:opacity-60"
            placeholder="Tell us about your screens, locations, or what you're planning."
          />
        </div>

        <div
          aria-hidden="true"
          className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
        >
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
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
          withArrow
          disabled={sending}
          className="h-12 w-full text-base"
        >
          {sending ? "Sending..." : "Send message"}
        </Button>

        <p className="text-center text-xs text-muted">
          We usually reply within one business day.
        </p>
      </form>
    </Card>
  );
}
