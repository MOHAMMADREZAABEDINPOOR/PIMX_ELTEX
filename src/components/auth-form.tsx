"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { FieldError, PasswordChecklist } from "./form-feedback";
import { PasswordField } from "./password-field";
import { TurnstileWidget } from "./turnstile-widget";
import { type FieldErrors, readFormResult, validateAuthFields } from "@/lib/form-validation";

type Mode = "login" | "signup" | "forgot";
type AuthResult = { message?: string; devCode?: string; user?: { role: string }; captchaRequired?: boolean; errors?: FieldErrors };

function valuesFromForm(form: HTMLFormElement) {
  return Object.fromEntries(Array.from(new FormData(form).entries(), ([key, value]) => [key, String(value)]));
}

function focusFirstError(form: HTMLFormElement, errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [captchaVersion, setCaptchaVersion] = useState(0);

  const copy = {
    login: { title: "Welcome back.", description: "Sign in to continue your saved work and conversations.", endpoint: "/api/auth/login", submit: "Sign in", alternate: <>New here? <Link href="/signup">Create an account</Link></> },
    signup: { title: "Join the studio.", description: "Save resources, join discussions, and build your own library.", endpoint: "/api/auth/signup", submit: "Create account", alternate: <>Already a member? <Link href="/login">Sign in</Link></> },
    forgot: { title: "Reset access.", description: "We will send a six-digit recovery code to your inbox.", endpoint: "/api/auth/forgot-password", submit: "Send recovery code", alternate: <Link href="/login">Return to sign in</Link> },
  }[mode];

  function clearField(name: string) {
    setFieldErrors((current) => current[name] ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== name)) : current);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = valuesFromForm(form);
    const clientErrors = validateAuthFields(mode, values);
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors); setMessage(""); focusFirstError(form, clientErrors); return;
    }
    setBusy(true); setMessage(""); setFieldErrors({});
    try {
      const response = await fetch(copy.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, turnstileToken }) });
      const result = await readFormResult<AuthResult>(response);
      if (!response.ok) {
        const errors = result.errors || {};
        setFieldErrors(errors); setMessage(Object.keys(errors).length ? "" : result.message || "Something went wrong.");
        focusFirstError(form, errors);
        setTurnstileToken(""); setCaptchaVersion((version) => version + 1);
        return;
      }
      if (mode === "login") {
        window.dispatchEvent(new Event("pimx-auth-change"));
        const requestedPath = new URLSearchParams(window.location.search).get("next");
        const safePath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/account";
        router.push(result.user?.role === "admin" ? "/admin" : safePath);
        router.refresh();
      } else router.push(`/${mode === "forgot" ? "reset-password" : "verify"}?email=${encodeURIComponent(values.email)}${result.devCode ? `&devCode=${result.devCode}` : ""}`);
    } catch (error) {
      setTurnstileToken(""); setCaptchaVersion((version) => version + 1);
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  const invalid = (name: string) => fieldErrors[name] ? true : undefined;
  const describedBy = (name: string, extra?: string) => [fieldErrors[name] ? `${name}-error` : "", extra || ""].filter(Boolean).join(" ") || undefined;

  return <div className="auth-page"><section className="auth-card"><Brand /><h1>{copy.title}</h1><p>{copy.description}</p>
    <form className="auth-form" onSubmit={submit} noValidate>
      {mode === "signup" ? <>
        <div className="form-row">
          <div className="field"><label htmlFor="name">Display name</label><input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your display name" aria-invalid={invalid("name")} aria-describedby={describedBy("name")} onChange={() => clearField("name")} /><FieldError id="name-error" message={fieldErrors.name} /></div>
          <div className="field"><label htmlFor="age">Age</label><input id="age" name="age" type="number" inputMode="numeric" required min={13} max={120} placeholder="Your age" aria-invalid={invalid("age")} aria-describedby={describedBy("age")} onChange={() => clearField("age")} /><FieldError id="age-error" message={fieldErrors.age} /></div>
        </div>
        <div className="field"><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="your_username" aria-invalid={invalid("username")} aria-describedby={describedBy("username", "username-hint")} onChange={() => clearField("username")} /><small className="field-hint" id="username-hint">Letters, numbers, and underscores only.</small><FieldError id="username-error" message={fieldErrors.username} /></div>
      </> : null}
      <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" aria-invalid={invalid("email")} aria-describedby={describedBy("email")} onChange={() => clearField("email")} /><FieldError id="email-error" message={fieldErrors.email} /></div>
      {mode !== "forgot" ? <div className="field"><label htmlFor="password">Password</label><PasswordField id="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 12 : 8} maxLength={128} required value={password} placeholder={mode === "signup" ? "Create a strong password" : "Your password"} aria-invalid={invalid("password")} aria-describedby={describedBy("password", mode === "signup" ? "password-requirements" : undefined)} onChange={(event) => { setPassword(event.target.value); clearField("password"); }} />{mode === "signup" ? <div id="password-requirements"><PasswordChecklist password={password} /></div> : null}<FieldError id="password-error" message={fieldErrors.password} /></div> : null}
      {mode === "login" ? <div style={{ textAlign: "right" }}><Link className="text-link" href="/forgot-password">Forgot password?</Link></div> : null}
      <TurnstileWidget resetKey={captchaVersion} onToken={setTurnstileToken} />
      {message ? <div className="form-message form-error" role="alert" aria-live="polite">{message}</div> : null}
      <button className="button button-accent" type="submit" disabled={busy || !turnstileToken}>{busy ? <LoaderCircle className="spin" size={15} /> : <>{copy.submit}<ArrowRight size={14} /></>}</button>
    </form><p className="form-note">{copy.alternate}</p>
  </section></div>;
}
