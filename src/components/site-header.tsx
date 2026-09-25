"use client";

import { ChevronDown, ChevronRight, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/lib/site-config";
import { initials } from "@/lib/utils";

const links = [["/", "Home"], ["/episodes", "Episodes"], ["/code", "Projects"]] as const;
type HeaderUser = { id: string; name: string; username: string; email: string; role: string };

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null | undefined>(undefined);
  const accountMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOutside = (event: PointerEvent) => { if (accountMenu.current && !accountMenu.current.contains(event.target as Node)) setAccountOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAccountOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [accountOpen]);

  const loadUser = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then((response) => response.json() as Promise<{ user: HeaderUser | null }>)
      .then((result) => setUser(result.user))
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setUser(null); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cancel = loadUser();
    const refresh = () => loadUser();
    window.addEventListener("pimx-auth-change", refresh);
    return () => { cancel(); window.removeEventListener("pimx-auth-change", refresh); };
  }, [loadUser]);

  async function signOut() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed.");
      setUser(null); setAccountOpen(false);
      window.dispatchEvent(new Event("pimx-auth-change"));
      router.push("/"); router.refresh();
    } catch {
      window.alert("Sign out could not be completed. Please try again.");
    }
  }

  return <header className="site-header-shell" style={{ viewTransitionName: "persistent-nav" }}><div className="site-header">
    <Brand />
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([href, label]) => <Link key={href} href={href} transitionTypes={[href === "/" ? "nav-back" : "nav-forward"]} className={href === "/" ? pathname === "/" ? "active" : "" : pathname.startsWith(href) ? "active" : ""} onClick={() => { setOpen(false); setAccountOpen(false); }}>{label}</Link>)}</nav>
    <div className="header-actions"><ThemeToggle />
      <div className="account-menu" ref={accountMenu}>
        {user ? <button type="button" className="account-avatar-button" aria-label="Open account menu" aria-expanded={accountOpen} aria-controls={accountOpen ? "account-popover" : undefined} onClick={() => setAccountOpen((value) => !value)}><span>{initials(user.name)}</span><ChevronDown size={13} /></button> : <Link href="/login" className="icon-button account-button" aria-label="Sign in"><UserRound size={17} /></Link>}
        {user && accountOpen ? <div className="account-popover" id="account-popover"><header className="account-popover-profile"><span className="account-avatar-large">{initials(user.name)}</span><div><strong>{user.name}</strong><small>@{user.username}</small></div></header><p className="account-popover-email">{user.email}</p><nav aria-label="Account navigation"><Link href="/account" onClick={() => setAccountOpen(false)}><span className="account-popover-icon"><LayoutDashboard size={17} /></span><span className="account-popover-label"><strong>Account activity</strong><small>Profile, comments and sessions</small></span><ChevronRight size={15} /></Link>{user.role === "admin" ? <Link href="/admin" onClick={() => setAccountOpen(false)}><span className="account-popover-icon"><ShieldCheck size={17} /></span><span className="account-popover-label"><strong>Admin console</strong><small>Content and member controls</small></span><ChevronRight size={15} /></Link> : null}</nav><div className="account-popover-footer"><button type="button" onClick={() => void signOut()}><span className="account-popover-icon"><LogOut size={17} /></span><span>Sign out</span></button></div></div> : null}
      </div>
      <a href={siteConfig.youtubeUrl} target="_blank" rel="noreferrer" className="button button-primary header-cta">Subscribe</a>
      <button type="button" className="icon-button mobile-menu-button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X size={18} /> : <Menu size={18} />}</button>
    </div>
  </div>{open ? <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([href, label]) => <Link key={href} href={href} transitionTypes={[href === "/" ? "nav-back" : "nav-forward"]} onClick={() => setOpen(false)}>{label}</Link>)}<Link href={user ? "/account" : "/login"} onClick={() => setOpen(false)}>{user ? `Account · ${user.name}` : "Sign in"}</Link>{user ? <button type="button" onClick={() => void signOut()}>Sign out</button> : null}</nav> : null}</header>;
}
