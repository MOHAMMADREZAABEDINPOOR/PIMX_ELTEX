"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { PasswordField } from "./password-field";
import { TurnstileWidget } from "./turnstile-widget";

type Mode = "login" | "signup" | "forgot";

type AuthResult = { message?: string; devCode?: string; user?: { role: string }; captchaRequired?: boolean };

async function readAuthResult(response: Response): Promise<AuthResult> {
  const body = await response.text();
  if (!body) throw new Error("The server could not complete this request. Please try again.");
  try {
    return JSON.parse(body) as AuthResult;
  } catch {
    throw new Error("The server returned an invalid response. Please try again.");
  }
}

function signupPasswordError(password: string) {
  if (password.length < 12) return "Password must contain at least 12 characters.";
  if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol such as !, @, #, or _.";
  return "";
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [captchaVersion, setCaptchaVersion] = useState(0);

  const copy = {
    login: { title: "Welcome back.", description: "Sign in to continue your saved work and conversations.", endpoint: "/api/auth/login", submit: "Sign in", alternate: <>New here? <Link href="/signup">Create an account</Link></> },
    signup: { title: "Join the studio.", description: "Save resources, join discussions, and build your own library.", endpoint: "/api/auth/signup", submit: "Create account", alternate: <>Already a member? <Link href="/login">Sign in</Link></> },
    forgot: { title: "Reset access.", description: "We will send a six-digit recovery code to your inbox.", endpoint: "/api/auth/forgot-password", submit: "Send recovery code", alternate: <Link href="/login">Return to sign in</Link> },
  }[mode];

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data: Record<string, FormDataEntryValue | string> = { ...Object.fromEntries(new FormData(event.currentTarget)), turnstileToken };
    if (mode === "signup") {
      const passwordError = signupPasswordError(String(data.password || ""));
      if (passwordError) {
        setMessage(passwordError);
        return;
      }
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch(copy.endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await readAuthResult(response);
      if (!response.ok) throw new Error(result.message || "Something went wrong.");
      if (mode === "login") router.push(result.user?.role === "admin" ? "/admin" : "/");
      else router.push(`/${mode === "forgot" ? "reset-password" : "verify"}?email=${encodeURIComponent(String(data.email))}${result.devCode ? `&devCode=${result.devCode}` : ""}`);
    } catch (error) {
      setTurnstileToken("");
      setCaptchaVersion((version) => version + 1);
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-page"><section className="auth-card"><Brand /><h1>{copy.title}</h1><p>{copy.description}</p>
      <form className="auth-form" onSubmit={submit}>
        {mode === "signup" ? <><div className="form-row"><div className="field"><label htmlFor="name">Display name</label><input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="Your display name" aria-invalid={Boolean(message)} /></div><div className="field"><label htmlFor="age">Age</label><input id="age" name="age" type="number" inputMode="numeric" required min={13} max={120} placeholder="Your age" aria-invalid={Boolean(message)} /></div></div><div className="field"><label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="your_username" aria-invalid={Boolean(message)} /></div></> : null}
        <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" aria-invalid={Boolean(message)} /></div>
        {mode !== "forgot" ? <div className="field"><label htmlFor="password">Password</label><PasswordField id="password" name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "signup" ? 12 : 8} maxLength={128} required placeholder={mode === "signup" ? "12+ chars, upper/lower, number, symbol" : "Your password"} aria-describedby={mode === "signup" ? "password-requirements" : undefined} aria-invalid={Boolean(message)} />{mode === "signup" ? <small className="field-hint" id="password-requirements">Use 12+ characters with uppercase, lowercase, a number, and a symbol.</small> : null}</div> : null}
        {mode === "login" ? <div style={{ textAlign: "right" }}><Link className="text-link" href="/forgot-password">Forgot password?</Link></div> : null}
        <TurnstileWidget key={captchaVersion} onToken={setTurnstileToken} />
        {message ? <div className="form-message form-error" role="alert" aria-live="polite">{message}</div> : null}
        <button className="button button-accent" type="submit" disabled={busy || !turnstileToken}>{busy ? <LoaderCircle className="spin" size={15} /> : <>{copy.submit}<ArrowRight size={14} /></>}</button>
      </form>
      <p className="form-note">{copy.alternate}</p>
    </section></div>
  );
}
