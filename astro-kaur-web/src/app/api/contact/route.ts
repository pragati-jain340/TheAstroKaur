import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin client to persist enquiries in contact_messages table
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qdnwmfriilknnwqrepuy.supabase.co",
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Basic in-memory rate limiting map: ip -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

const ALLOWED_SUBJECTS = [
  "Choosing a Reading",
  "Reading & Pricing",
  "Booking Enquiry",
  "General Question",
  "Other",
];

function sanitize(str: string): string {
  return str.replace(/[<>]/g, "");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting check by client IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "anonymous";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          error:
            "Too many enquiries submitted in a short time. Please wait a few moments before trying again.",
        },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body = await req.json().catch(() => ({}));
    const { name, email, subject, message, _hp } = body;

    // Honeypot check (bot prevention)
    if (_hp) {
      // Silently accept without sending
      return NextResponse.json({
        success: true,
        message:
          "Thank you for reaching out! Your enquiry has been submitted successfully. We'll get back to you as soon as possible.",
      });
    }

    // 3. Validation
    const cleanName = typeof name === "string" ? sanitize(name.trim()) : "";
    const cleanEmail = typeof email === "string" ? email.trim() : "";
    const cleanSubject = typeof subject === "string" ? sanitize(subject.trim()) : "";
    const cleanMessage = typeof message === "string" ? message.trim() : "";

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json(
        { error: "Please enter your full name (at least 2 characters)." },
        { status: 400 }
      );
    }

    if (cleanName.length > 100) {
      return NextResponse.json(
        { error: "Name must not exceed 100 characters." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address (e.g. name@example.com)." },
        { status: 400 }
      );
    }

    if (!cleanSubject || !ALLOWED_SUBJECTS.includes(cleanSubject)) {
      return NextResponse.json(
        { error: "Please select a subject from the provided options." },
        { status: 400 }
      );
    }

    if (!cleanMessage || cleanMessage.length < 5) {
      return NextResponse.json(
        { error: "Please enter your message (at least 5 characters)." },
        { status: 400 }
      );
    }

    if (cleanMessage.length > 5000) {
      return NextResponse.json(
        { error: "Message must not exceed 5000 characters." },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();
    const formattedDate = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    });

    // 4. Save enquiry into database (public.contact_messages)
    let dbSaved = false;
    try {
      const { error: dbErr } = await supabaseAdmin
        .from("contact_messages")
        .insert({
          sender_name: cleanName,
          email: cleanEmail,
          subject: cleanSubject,
          message: cleanMessage,
          status: "unread",
          created_at: timestamp,
          updated_at: timestamp,
        });

      if (!dbErr) {
        dbSaved = true;
      } else {
        console.warn("Could not insert into contact_messages:", dbErr.message);
      }
    } catch (dbEx) {
      console.warn("Database storage warning:", dbEx);
    }

    // 5. Verify Resend environment configuration
    const resendApiKey = process.env.RESEND_API_KEY;
    let contactEmail = process.env.CONTACT_EMAIL || "jainpragati4566@gmail.com";
    if (
      contactEmail.trim().toLowerCase() === "pragatijain841@gmail.com" ||
      contactEmail.trim().toLowerCase() === "pragatiijain841@gmail.com"
    ) {
      // In Resend sandbox mode without verified domain, onboarding@resend.dev requires the account owner address
      contactEmail = "jainpragati4566@gmail.com";
    }
    // Verified sender in Resend: default onboarding@resend.dev; change to hello@theastrokaur.com once custom domain is verified
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.error(
        "[Resend Config Error] RESEND_API_KEY is not defined in environment variables."
      );
      return NextResponse.json(
        {
          error:
            "Email service is currently being configured. Your enquiry has been recorded, or you can email us directly.",
        },
        { status: 500 }
      );
    }

    if (!contactEmail) {
      console.error(
        "[Resend Config Error] CONTACT_EMAIL recipient is not defined in environment variables."
      );
      return NextResponse.json(
        {
          error:
            "Contact recipient is not properly configured. Please try again shortly.",
        },
        { status: 500 }
      );
    }

    // Format sender identity
    const fromAddress = resendFromEmail.includes("<")
      ? resendFromEmail
      : `TheAstroKaur <${resendFromEmail}>`;

    // 6. Build HTML & Plaintext Email Body
    const emailSubject = `New Website Enquiry: ${cleanSubject} — TheAstroKaur`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; line-height: 1.6;">
  <div style="max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border: 1px solid rgba(229, 184, 66, 0.35); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Banner -->
    <div style="background-color: #0F172A; padding: 32px 30px; text-align: center; border-bottom: 3px solid #E5B842;">
      <div style="color: #E5B842; font-size: 20px; margin-bottom: 6px;">✦</div>
      <h1 style="margin: 0; color: #FAF8F5; font-family: Georgia, serif; font-size: 24px; font-weight: normal; letter-spacing: 0.5px;">
        TheAstroKaur
      </h1>
      <p style="margin: 6px 0 0; color: #E5B842; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
        New Website Enquiry
      </p>
    </div>

    <!-- Body Content -->
    <div style="padding: 32px 30px;">
      <p style="margin-top: 0; font-size: 15px; color: #334155;">
        You have received a new enquiry through the contact form on <strong>TheAstroKaur</strong> website.
      </p>

      <!-- Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #FAF8F5; border: 1px solid rgba(15, 23, 42, 0.08); border-radius: 12px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748B; width: 130px; border-bottom: 1px solid rgba(15, 23, 42, 0.08);">Full Name</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #0F172A; border-bottom: 1px solid rgba(15, 23, 42, 0.08);">${escapeHtml(cleanName)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748B; border-bottom: 1px solid rgba(15, 23, 42, 0.08);">Email Address</td>
          <td style="padding: 12px 16px; font-size: 14px; color: #0F172A; border-bottom: 1px solid rgba(15, 23, 42, 0.08);">
            <a href="mailto:${escapeHtml(cleanEmail)}" style="color: #6B3448; text-decoration: underline; font-weight: 500;">${escapeHtml(cleanEmail)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748B; border-bottom: 1px solid rgba(15, 23, 42, 0.08);">Subject Topic</td>
          <td style="padding: 12px 16px; font-size: 14px; color: #0F172A; font-weight: 500; border-bottom: 1px solid rgba(15, 23, 42, 0.08);">${escapeHtml(cleanSubject)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748B;">Submitted At</td>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748B;">${escapeHtml(formattedDate)} (UTC)</td>
        </tr>
      </table>

      <!-- Message Quotation -->
      <div style="margin-top: 24px;">
        <p style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 8px;">
          Message:
        </p>
        <div style="padding: 20px; background-color: #FFFFFF; border-left: 3px solid #E5B842; border-top: 1px solid rgba(15, 23, 42, 0.08); border-right: 1px solid rgba(15, 23, 42, 0.08); border-bottom: 1px solid rgba(15, 23, 42, 0.08); border-radius: 0 12px 12px 0; font-size: 14px; color: #1E293B; white-space: pre-wrap; line-height: 1.7;">
${escapeHtml(cleanMessage)}
        </div>
      </div>

      <!-- Quick Reply Instructions -->
      <div style="margin-top: 30px; padding: 14px 18px; background-color: rgba(229, 184, 66, 0.12); border-radius: 10px; font-size: 12px; color: #6B3448;">
        💡 <strong>Quick Reply:</strong> You can hit <em>Reply</em> in your email client to respond directly to <strong>${escapeHtml(cleanName)}</strong> at <code>${escapeHtml(cleanEmail)}</code>.
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 20px 30px; background-color: #FAF8F5; text-align: center; border-top: 1px solid rgba(15, 23, 42, 0.08); font-size: 11px; color: #94A3B8;">
      TheAstroKaur · Vedic Astrology Consultation &amp; Life Guidance<br>
      Automated enquiry dispatch via Resend
    </div>
  </div>
</body>
</html>
    `.trim();

    const emailText = `
New Website Enquiry — TheAstroKaur
----------------------------------
Sender: ${cleanName}
Email: ${cleanEmail}
Subject: ${cleanSubject}
Date: ${formattedDate} (UTC)

Message:
${cleanMessage}

---
You can reply directly to this email to respond to ${cleanName} (${cleanEmail}).
    `.trim();

    // 7. Send through Resend REST API
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [contactEmail],
        reply_to: cleanEmail,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      }),
    });

    const resendData = await resendResponse.json().catch(() => ({}));

    if (!resendResponse.ok) {
      console.error("[Resend API Error]", {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        resendData,
      });

      // If already safely stored in database, return success to the visitor
      if (dbSaved) {
        return NextResponse.json({
          success: true,
          message:
            "Thank you for reaching out! Your enquiry has been received and saved. We'll get back to you as soon as possible.",
        });
      }

      // Special handling for Resend onboarding limitation error if db save also failed
      if (
        resendData?.message &&
        typeof resendData.message === "string" &&
        resendData.message.includes("can only send testing emails to your own email address")
      ) {
        return NextResponse.json(
          {
            error:
              "Resend testing mode restriction: While using onboarding@resend.dev, emails can only be delivered to the verified Resend account owner email.",
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Could not deliver your message at this moment. Please try again or reach out to us directly.",
        },
        { status: 502 }
      );
    }

    // 8. Confirmed email delivery by Resend
    return NextResponse.json({
      success: true,
      id: resendData?.id,
      message:
        "Thank you for reaching out! Your enquiry has been submitted successfully. We'll get back to you as soon as possible.",
    });
  } catch (err: unknown) {
    console.error("[POST /api/contact unexpected error]:", err);
    return NextResponse.json(
      {
        error:
          "An unexpected error occurred while processing your enquiry. Please try again.",
      },
      { status: 500 }
    );
  }
}
