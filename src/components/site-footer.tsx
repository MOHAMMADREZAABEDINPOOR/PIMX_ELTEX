import Link from "next/link";
import { Brand } from "./brand";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return <footer className="site-footer simple-footer">
    <div className="simple-footer-main"><div><Brand /><p>Episodes and projects for curious builders.</p></div><nav aria-label="Footer navigation"><Link href="/">Home</Link><Link href="/episodes">Episodes</Link><Link href="/code">Projects</Link><Link href="/contact">Contact</Link></nav></div>
    <div className="simple-footer-bottom"><span>© 2026 PIMX_ELTEX</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href={siteConfig.youtubeUrl} target="_blank" rel="noreferrer">YouTube</a></div></div>
  </footer>;
}
