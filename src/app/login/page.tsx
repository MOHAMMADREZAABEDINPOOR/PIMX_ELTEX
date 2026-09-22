import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/session";
export const metadata: Metadata = { title: "Sign in", description: "Sign in securely to your PIMX_ELTEX account to comment, reply, and manage resources.", robots: { index: false, follow: false } };
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return <AuthForm mode="login" />;
}
