"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isEmail, readFormResult } from "@/lib/form-validation";

export function NewsletterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!isEmail(String(data.email || ""))) { setError("Enter a valid email address."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await readFormResult<{ message?: string }>(response);
      if (!response.ok) throw new Error(result.message || "Subscription failed.");
      router.push("/thank-you");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Subscription failed."); }
    finally { setBusy(false); }
  }

  return <form className="subscribe-form" onSubmit={submit} noValidate><label className="sr-only" htmlFor="newsletter-email">Email address</label><input id="newsletter-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required aria-invalid={error ? true : undefined} aria-describedby={error ? "newsletter-error" : undefined} onChange={() => setError("")} /><input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" /><button className="button button-accent" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <>Join the field notes <ArrowRight size={14} /></>}</button>{error ? <span id="newsletter-error" className="newsletter-error" role="alert">{error}</span> : null}</form>;
}
