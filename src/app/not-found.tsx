import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found", description: "The requested PIMX_ELTEX page could not be found.", robots: { index: false, follow: false } };

export default function NotFound() {
  return <section className="status-page"><div className="status-code">404</div><SearchX size={42} /><span className="eyebrow">Page not found</span><h1>This page left the timeline.</h1><p>The address may be incorrect, or the resource may have moved. The episode and project libraries are still waiting for you.</p><div className="status-actions"><Link href="/" className="button button-primary"><ArrowLeft size={15} /> Back home</Link><Link href="/episodes" className="button button-accent">Browse episodes</Link></div></section>;
}
