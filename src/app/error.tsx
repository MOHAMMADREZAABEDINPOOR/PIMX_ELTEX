"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="status-page"><AlertTriangle size={42} /><span className="eyebrow">Something went wrong</span><h1>We could not load this page.</h1><p>Your data is safe. Try the request again, or return later if the problem continues.</p><button type="button" className="button button-accent" onClick={reset}><RotateCcw size={15} /> Try again</button></section>;
}
