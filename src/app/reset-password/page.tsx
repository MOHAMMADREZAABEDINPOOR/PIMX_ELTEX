import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";
export const metadata: Metadata = { title: "Choose a new password", description: "Choose a new password after verifying your PIMX_ELTEX recovery code.", robots: { index: false, follow: false } };
export default function ResetPasswordPage() { return <Suspense fallback={<div className="auth-page">Loading recovery…</div>}><ResetPasswordForm /></Suspense>; }
