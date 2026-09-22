"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { FieldError, PasswordChecklist } from "./form-feedback";
import { PasswordField } from "./password-field";
import { type FieldErrors, passwordError, readFormResult, validateCode } from "@/lib/form-validation";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [code, setCode] = useState(params.get("devCode") || "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!params.get("email")) { setMessage("Your email address is missing. Request a new recovery code."); return; }
    const localErrors: FieldErrors = {};
    const codeMessage = validateCode(code); const passwordMessage = passwordError(password);
    if (codeMessage) localErrors.code = codeMessage;
    if (passwordMessage) localErrors.password = passwordMessage;
    if (Object.keys(localErrors).length) { setErrors(localErrors); setMessage(""); return; }
    setBusy(true); setErrors({}); setMessage("");
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: params.get("email"), code, password }) });
      const result = await readFormResult<{ message?: string; errors?: FieldErrors }>(response);
      if (!response.ok) { const nextErrors = result.errors || {}; setErrors(nextErrors); setMessage(Object.keys(nextErrors).length ? "" : result.message || "The password could not be updated."); return; }
      router.push("/login?reset=1");
    } catch { setMessage("The password could not be updated. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  return <div className="auth-page"><section className="auth-card"><Brand /><h1>Choose a new password.</h1><p>Create a strong password, then confirm it with the recovery code from your email.</p><form className="auth-form" onSubmit={submit} noValidate><div className="field"><label htmlFor="reset-code">Recovery code</label><input id="reset-code" name="code" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setErrors((current) => ({ ...current, code: "" })); }} required aria-invalid={errors.code ? true : undefined} aria-describedby={errors.code ? "reset-code-error" : "reset-code-hint"} /><small className="field-hint" id="reset-code-hint">Use the latest six-digit code.</small><FieldError id="reset-code-error" message={errors.code} /></div><div className="field"><label htmlFor="new-password">New password</label><PasswordField id="new-password" name="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: "" })); }} required aria-invalid={errors.password ? true : undefined} aria-describedby="new-password-requirements new-password-error" /><div id="new-password-requirements"><PasswordChecklist password={password} /></div><FieldError id="new-password-error" message={errors.password} /></div>{message ? <div className="form-message form-error" role="alert" aria-live="polite">{message}</div> : null}<button className="button button-accent" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={15} /> Updating…</> : "Update password"}</button></form></section></div>;
}
