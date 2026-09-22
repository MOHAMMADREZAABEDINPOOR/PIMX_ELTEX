"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { PasswordField } from "./password-field";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("devCode") || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: params.get("email"), code, password }) });
      const result = await response.json() as { message?: string };
      if (!response.ok) throw new Error(result.message || "The password could not be updated.");
      router.push("/login?reset=1");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The password could not be updated."); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><section className="auth-card"><Brand /><h1>Choose a new password.</h1><p>Use at least 12 characters with upper and lowercase letters, a number, and a symbol.</p><form className="auth-form" onSubmit={submit}><div className="field"><label htmlFor="reset-code">Recovery code</label><input id="reset-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required aria-invalid={Boolean(message)} /></div><div className="field"><label htmlFor="new-password">New password</label><PasswordField id="new-password" name="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required aria-invalid={Boolean(message)} /></div>{message ? <div className="form-message form-error" role="alert" aria-live="polite">{message}</div> : null}<button className="button button-accent" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Updating…</> : "Update password"}</button></form></section></div>;
}
