import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Reset password", description: "Request a secure one-time code to reset your PIMX_ELTEX password.", robots: { index: false, follow: false } };
export default function ForgotPasswordPage() { return <AuthForm mode="forgot" />; }
