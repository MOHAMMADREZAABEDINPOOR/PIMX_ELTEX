"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.dispatchEvent(new Event("pimx-auth-change"));
    router.push("/"); router.refresh();
  }
  return <button className="button button-secondary" type="button" disabled={busy} onClick={() => void signOut()}><LogOut size={15} /> {busy ? "Signing out…" : "Sign out"}</button>;
}
