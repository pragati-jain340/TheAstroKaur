import "server-only";
import nodemailer from "nodemailer";

export class EmailDeliveryUncertain extends Error {}

export function smtpTransport() {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  const port = Number(process.env.SMTP_PORT || "465");
  if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("SMTP configuration is missing or invalid.");
  return nodemailer.createTransport({
    host, port, secure: port === 465, requireTLS: port !== 465,
    auth: { user, pass },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true,
  });
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  messageId?: string;
}) {
  const transport = smtpTransport();
  try {
    const result = await transport.sendMail({
      ...message,
      from: process.env.SMTP_FROM || { name: "TheAstroKaur", address: process.env.SMTP_USER! },
    });
    if (!result.accepted.length || result.rejected.length)
      throw Object.assign(new Error("SMTP rejected the recipient."), { responseCode: 550 });
    if (!result.messageId)
      throw new EmailDeliveryUncertain("SMTP acceptance is uncertain; review the sender's Sent folder before retrying.");
    return result.messageId;
  } catch (error) {
    const smtp = error as { code?: string; responseCode?: number };
    if ((smtp.responseCode && smtp.responseCode >= 400) || ["EAUTH", "EDNS", "ETLS", "EENVELOPE", "ECONNREFUSED"].includes(smtp.code || ""))
      throw new Error(`SMTP rejected the email (${smtp.responseCode || smtp.code}). Check the mailbox credentials, recipient and sending limits.`);
    throw new EmailDeliveryUncertain("SMTP acceptance is uncertain; review the sender's Sent folder before retrying.");
  } finally {
    transport.close();
  }
}
