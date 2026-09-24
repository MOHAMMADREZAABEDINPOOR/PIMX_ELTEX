import "server-only";
import { otpEmail } from "@/emails/otp-email";
import { EmailDeliveryError, sendSmtpEmail } from "@/lib/smtp-client";

export { EmailDeliveryError };

export async function sendOtpEmail({ to, code, purpose, user, appPassword }: { to: string; code: string; purpose: string; user?: string; appPassword?: string }) {
  if (!user || !appPassword) return { sent: false, reason: "Email service is not configured." };
  try {
    await sendSmtpEmail({ user, appPassword, to, html: otpEmail({ code, purpose }) });
    return { sent: true };
  } catch (error) {
    const status = error instanceof EmailDeliveryError ? error.status : 0;
    console.error("SMTP delivery failed", { status });
    throw new EmailDeliveryError(status);
  }
}
