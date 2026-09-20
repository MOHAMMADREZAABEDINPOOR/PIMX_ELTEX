import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyForm } from "@/components/verify-form";
export const metadata: Metadata = { title: "Verify email", description: "Verify your PIMX_ELTEX account with a single-use email code.", robots: { index: false, follow: false } };
export default function VerifyPage() { return <Suspense fallback={<div className="auth-page">Loading verification…</div>}><VerifyForm /></Suspense>; }
