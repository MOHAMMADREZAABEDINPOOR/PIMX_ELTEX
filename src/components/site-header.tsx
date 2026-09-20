"use client";

import { Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { siteConfig } from "@/lib/site-config";

const links = [
  ["/", "Home"],
  ["/episodes", "Episodes"],
  ["/code", "Projects"],
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header-shell" style={{ viewTransitionName: "persistent-nav" }}>
      <div className="site-header">
        <Brand />
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} transitionTypes={[href === "/" ? "nav-back" : "nav-forward"]} className={href === "/" ? pathname === "/" ? "active" : "" : pathname.startsWith(href) ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Link href="/login" className="icon-button account-button" aria-label="Sign in">
            <UserRound size={17} />
          </Link>
          <a
            href={siteConfig.youtubeUrl}
            target="_blank"
            rel="noreferrer"
            className="button button-primary header-cta"
          >
            Subscribe
          </a>
          <button
            type="button"
            className="icon-button mobile-menu-button"
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} transitionTypes={[href === "/" ? "nav-back" : "nav-forward"]} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
        </nav>
      ) : null}
    </header>
  );
}
