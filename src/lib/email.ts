import "server-only";
import { otpEmail } from "@/emails/otp-email";

export async function sendOtpEmail({ to, code, purpose, apiKey, from }: { to: string; code: string; purpose: string; apiKey?: string; from?: string }) {
  if (!apiKey || !from) return { sent: false, reason: "Email service is not configured." };
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject: "Your PIMX_ELTEX verification code", html: otpEmail({ code, purpose }) }),
  });
  if (!response.ok) throw new Error("The verification email could not be sent.");
  return { sent: true };
}
