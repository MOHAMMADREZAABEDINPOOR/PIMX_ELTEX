import "server-only";
import { otpEmail } from "@/emails/otp-email";

export class EmailDeliveryError extends Error {
  constructor(public readonly status: number) {
    super("The verification email provider rejected the request.");
    this.name = "EmailDeliveryError";
  }
}

export async function sendOtpEmail({ to, code, purpose, apiKey, from }: { to: string; code: string; purpose: string; apiKey?: string; from?: string }) {
  if (!apiKey || !from) return { sent: false, reason: "Email service is not configured." };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject: "Your PIMX_ELTEX verification code", html: otpEmail({ code, purpose }) }),
    });
    if (!response.ok) {
      console.error("Email provider rejected delivery", { status: response.status });
      throw new EmailDeliveryError(response.status);
    }
    return { sent: true };
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    console.error("Email provider request failed", error instanceof Error ? error.message : "Unknown network error");
    throw new EmailDeliveryError(0);
  }
}
