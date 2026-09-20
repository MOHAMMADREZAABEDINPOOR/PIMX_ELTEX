"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";

export function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("devCode") || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: params.get("email"), code }) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "Verification failed.");
      router.push("/login?verified=1");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Verification failed."); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><section className="auth-card"><Brand /><h1>Verify your email.</h1><p>Enter the six-digit code sent to {params.get("email") || "your inbox"}. It expires after ten minutes.</p><form className="auth-form" onSubmit={submit}><div className="field"><label className="sr-only" htmlFor="verification-code">Six-digit verification code</label><input id="verification-code" className="single-otp" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required aria-invalid={Boolean(message)} /></div>{params.get("devCode") ? <div className="form-message">Development mode filled the local verification code.</div> : null}{message ? <div className="form-message form-error" role="alert">{message}</div> : null}<button type="submit" className="button button-accent" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Verifying…</> : "Verify account"}</button></form></section></div>;
}
