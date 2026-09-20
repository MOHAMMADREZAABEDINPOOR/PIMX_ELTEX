"use client";

import { PlayCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site-config";

export function MobileCta() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || /^\/(login|signup|verify|forgot-password|reset-password)(\/|$)/.test(pathname)) return null;
  return <aside className="mobile-sticky-cta" aria-label="Channel call to action"><a href={siteConfig.youtubeUrl} target="_blank" rel="noreferrer"><PlayCircle size={17} /> Watch on YouTube</a></aside>;
}
