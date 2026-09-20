import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = { title: "Create account", description: "Create and verify a secure PIMX_ELTEX community account.", robots: { index: false, follow: false } };
export default function SignupPage() { return <AuthForm mode="signup" />; }
