import { env } from "../config/env";
import type { OutboundMail } from "./smtp-client";

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

/** Resend HTTP API (port 443) — required on hosts that block outbound SMTP. */
export async function sendResendApi(mail: OutboundMail): Promise<string> {
  const apiKey = env.RESEND_API_KEY ?? env.smtp.pass;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send via Resend API");
  }

  const payload: Record<string, unknown> = {
    from: mail.from,
    to: [mail.to],
    subject: mail.subject,
  };
  if (mail.html) payload.html = mail.html;
  if (mail.text) payload.text = mail.text;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: ResendSendResponse = {};
  try {
    data = raw ? (JSON.parse(raw) as ResendSendResponse) : {};
  } catch {
    // keep raw body for error message
  }

  if (!response.ok) {
    throw new Error(
      data.message ??
        data.name ??
        `resend_api_${response.status}: ${raw.slice(0, 300)}`,
    );
  }

  if (!data.id) {
    throw new Error(`resend_api_missing_id: ${raw.slice(0, 300)}`);
  }

  return data.id;
}
