"use client";

import { Check, LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldError } from "./form-feedback";
import { displayNameError, readFormResult } from "@/lib/form-validation";

type UpdateResult = {
  message?: string;
  errors?: Record<string, string>;
  user?: { name: string };
};

export function AccountProfileForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const localError = displayNameError(name);
    if (localError) { setError(localError); setMessage(""); return; }
    if (name.trim() === savedName) { setMessage("Your display name is already up to date."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await readFormResult<UpdateResult>(response);
      if (!response.ok) { setError(result.errors?.name || ""); setMessage(result.errors?.name ? "" : result.message || "Your profile could not be updated."); return; }
      const nextName = result.user?.name || name.trim();
      setName(nextName); setSavedName(nextName); setMessage(result.message || "Display name updated.");
      window.dispatchEvent(new Event("pimx-auth-change"));
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Your profile could not be updated.");
    } finally { setBusy(false); }
  }

  return <form className="account-profile-form" onSubmit={submit} noValidate>
    <div className="field"><label htmlFor="account-display-name">Display name</label><input id="account-display-name" name="name" autoComplete="name" required minLength={2} maxLength={80} value={name} aria-invalid={error ? true : undefined} aria-describedby={error ? "account-display-name-error" : "account-display-name-hint"} onChange={(event) => { setName(event.target.value); setError(""); setMessage(""); }} /><small className="field-hint" id="account-display-name-hint">This name appears on your profile and comments.</small><FieldError id="account-display-name-error" message={error} /></div>
    <button className="button button-secondary" type="submit" disabled={busy || name.trim() === savedName}>{busy ? <LoaderCircle className="spin" size={14} /> : <Save size={14} />} Save name</button>
    {message ? <p className="account-profile-message" role="status"><Check size={13} /> {message}</p> : null}
  </form>;
}
