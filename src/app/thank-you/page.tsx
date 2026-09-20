import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Thank you", description: "Your request was received by PIMX_ELTEX.", robots: { index: false, follow: false } };
export default function ThankYouPage() { return <section className="status-page"><CheckCircle2 size={46} /><span className="eyebrow">Message received</span><h1>Thank you for reaching out.</h1><p>Your request has been received. Continue exploring the latest videos and downloadable projects while you wait.</p><div className="status-actions"><Link href="/episodes" className="button button-accent">Explore episodes</Link><Link href="/" className="button button-secondary">Back home</Link></div></section>; }
