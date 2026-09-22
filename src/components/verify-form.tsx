"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { FieldError } from "./form-feedback";
import { readFormResult, validateCode } from "@/lib/form-validation";

export function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("devCode") || "");
  const [codeError, setCodeError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!params.get("email")) { setMessage("Your email address is missing. Return to sign up and request a new code."); return; }
    const localError = validateCode(code);
    if (localError) { setCodeError(localError); setMessage(""); return; }
    setBusy(true); setCodeError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: params.get("email"), code }) });
      const result = await readFormResult<{ message?: string; errors?: Record<string, string> }>(response);
      if (!response.ok) { setCodeError(result.errors?.code || ""); setMessage(result.errors?.code ? "" : result.message || "Verification failed."); return; }
      router.push("/login?verified=1");
    } catch { setMessage("Verification could not be completed. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><section className="auth-card"><Brand /><h1>Verify your email.</h1><p>Enter the six-digit code sent to {params.get("email") || "your inbox"}. It expires after ten minutes.</p><form className="auth-form" onSubmit={submit} noValidate><div className="field"><label className="sr-only" htmlFor="verification-code">Six-digit verification code</label><input id="verification-code" className="single-otp" name="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(""); }} placeholder="000000" required aria-invalid={codeError ? true : undefined} aria-describedby={codeError ? "verification-code-error" : "verification-code-hint"} /><small className="field-hint" id="verification-code-hint">Enter all six digits from the latest email.</small><FieldError id="verification-code-error" message={codeError} /></div>{params.get("devCode") ? <div className="form-message">Development mode filled the local verification code.</div> : null}{message ? <div className="form-message form-error" role="alert" aria-live="polite">{message}</div> : null}<button type="submit" className="button button-accent" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Verifying…</> : "Verify account"}</button></form></section></div>;
}
