import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";
export const metadata: Metadata = { title: "Create account", description: "Create and verify a secure PIMX_ELTEX community account.", robots: { index: false, follow: false } };
export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  return <AuthForm mode="signup" />;
}
