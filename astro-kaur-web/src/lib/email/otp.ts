import "server-only";
import crypto from "crypto";
import { database } from "@/lib/booking/server";
import { sendEmail } from "./smtp";

export type OtpPurpose = "signup" | "reset_password" | "change_password";

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 5;

/**
 * Generates a cryptographically strong 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with the user's email and server secret as salt.
 */
export function hashOtp(email: string, otp: string): string {
  const secret = process.env.SUPABASE_SECRET_KEY || "theastrokaur-otp-salt";
  return crypto
    .createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${otp.trim()}:${secret}`)
    .digest("hex");
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c] || c));
}

/**
 * Renders a celestial-themed responsive HTML template for OTP verification.
 */
export function renderOtpHtml(otp: string, purpose: OtpPurpose): string {
  const headings: Record<OtpPurpose, { title: string; subtitle: string; action: string }> = {
    signup: {
      title: "Verify Your Email",
      subtitle: "Welcome to TheAstroKaur",
      action: "Use the 6-digit verification code below to verify your email address and activate your account:",
    },
    reset_password: {
      title: "Reset Your Password",
      subtitle: "Account Security",
      action: "We received a request to reset your password. Use the verification code below to proceed:",
    },
    change_password: {
      title: "Confirm Password Change",
      subtitle: "Account Security",
      action: "We received a request to change your account password. Enter this verification code to confirm the change:",
    },
  };

  const info = headings[purpose];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(info.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; border: 1px solid rgba(229, 184, 66, 0.35); box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06); overflow: hidden; padding: 36px 32px;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 26px; font-weight: 500; color: #0F172A; letter-spacing: -0.01em;">
                TheAstroKaur
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #E5B842; font-weight: 600;">
                Written In The Stars
              </p>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding-bottom: 12px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #0F172A;">
                ${escapeHtml(info.title)}
              </h2>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding-bottom: 24px; font-size: 14px; line-height: 1.6; color: #475569;">
              ${escapeHtml(info.action)}
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #FAF8F5; border: 2px dashed #E5B842; border-radius: 14px; padding: 16px 28px; text-align: center;">
                <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0F172A; margin-left: 8px;">
                  ${escapeHtml(otp)}
                </span>
              </div>
            </td>
          </tr>

          <!-- Expiration notice -->
          <tr>
            <td style="padding-bottom: 28px; font-size: 13px; line-height: 1.5; color: #64748B; text-align: center;">
              This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.<br />
              For security, never share this code with anyone.
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 11px; line-height: 1.5; color: #94A3B8; text-align: center;">
              If you did not request this verification, you can safely ignore this email. No changes will be made to your account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Creates and delivers an OTP to the given email via SMTP.
 */
export async function createAndSendOtp(
  email: string,
  purpose: OtpPurpose
): Promise<{ success: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const db = database();

  // Rate-limiting cooldown: check if code was generated in the last 60 seconds
  const cutoff = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000).toISOString();
  const { data: recent } = await db
    .from("email_otp_verifications")
    .select("id, created_at")
    .eq("email", normalizedEmail)
    .eq("purpose", purpose)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent) {
    return {
      success: false,
      error: "Please wait 60 seconds before requesting another verification code.",
    };
  }

  // Clear previous unused OTPs for this (email, purpose)
  await db
    .from("email_otp_verifications")
    .delete()
    .eq("email", normalizedEmail)
    .eq("purpose", purpose);

  const otp = generateOtp();
  const otpHash = hashOtp(normalizedEmail, otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  const { error: insertError } = await db.from("email_otp_verifications").insert({
    email: normalizedEmail,
    otp_hash: otpHash,
    purpose,
    expires_at: expiresAt,
    attempts: 0,
  });

  if (insertError) {
    console.error("Failed to store verification record:", insertError);
    return {
      success: false,
      error: "Unable to process verification request. Please try again.",
    };
  }

  const subjects: Record<OtpPurpose, string> = {
    signup: "Your verification code — TheAstroKaur",
    reset_password: "Reset your password — TheAstroKaur",
    change_password: "Confirm password change — TheAstroKaur",
  };

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: subjects[purpose],
      text: `Your TheAstroKaur verification code is: ${otp}\n\nIt expires in ${OTP_EXPIRY_MINUTES} minutes. Do not share this code with anyone.`,
      html: renderOtpHtml(otp, purpose),
    });
    return { success: true };
  } catch (err: unknown) {
    console.error("SMTP delivery failed for OTP:", err);
    // Cleanup the record so user can retry immediately if SMTP failed
    await db
      .from("email_otp_verifications")
      .delete()
      .eq("email", normalizedEmail)
      .eq("purpose", purpose);

    const message = err instanceof Error ? err.message : "Failed to send email.";
    return {
      success: false,
      error: message.includes("SMTP rejected")
        ? "Unable to deliver email to this address. Please check your email address."
        : "Email delivery service is momentarily unavailable. Please retry in a few moments.",
    };
  }
}

/**
 * Validates an OTP. On success, permanently deletes the record to prevent replay.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  purpose: OtpPurpose
): Promise<{ valid: boolean; error?: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const cleanOtp = otp.trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, error: "Please enter a valid 6-digit code." };
  }

  const db = database();
  const { data: record, error: fetchError } = await db
    .from("email_otp_verifications")
    .select("id, otp_hash, attempts, expires_at")
    .eq("email", normalizedEmail)
    .eq("purpose", purpose)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError || !record) {
    return {
      valid: false,
      error: "No active verification code found. Please request a new code.",
    };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await db.from("email_otp_verifications").delete().eq("id", record.id);
    return {
      valid: false,
      error: "This verification code has expired. Please request a new code.",
    };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await db.from("email_otp_verifications").delete().eq("id", record.id);
    return {
      valid: false,
      error: "Too many incorrect attempts. Please request a new code.",
    };
  }

  const expectedHash = hashOtp(normalizedEmail, cleanOtp);

  let match = false;
  try {
    match = crypto.timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(record.otp_hash, "hex")
    );
  } catch {
    match = false;
  }

  if (!match) {
    const nextAttempts = record.attempts + 1;
    if (nextAttempts >= MAX_ATTEMPTS) {
      await db.from("email_otp_verifications").delete().eq("id", record.id);
      return {
        valid: false,
        error: "Too many incorrect attempts. Please request a new code.",
      };
    }

    await db
      .from("email_otp_verifications")
      .update({ attempts: nextAttempts })
      .eq("id", record.id);

    const remaining = MAX_ATTEMPTS - nextAttempts;
    return {
      valid: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
    };
  }

  // Code verified! Delete record to prevent replay
  await db.from("email_otp_verifications").delete().eq("id", record.id);
  return { valid: true };
}
