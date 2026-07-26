import type { Message } from "@prisma/client";
import { env } from "../config/env";
import { sendResendApi } from "./resend-api";
import {
  describeMailTransport,
  sendSmtp,
  type OutboundMail,
} from "./smtp-client";

function formatSendError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (err.name === "AggregateError" && "errors" in err) {
    const nested = (err as AggregateError).errors
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .join("; ");
    return nested || err.message || err.name;
  }
  return err.message || err.name;
}

/** Routes staging → Resend HTTPS API; local/production → SMTP. */
export async function sendMail(mail: OutboundMail): Promise<string> {
  const transport = describeMailTransport();
  const startedAt = Date.now();
  const useResendApi = env.smtp.provider === "resend";

  console.log(
    JSON.stringify({
      event: "email.sending",
      provider: env.smtp.provider,
      transport,
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
    }),
  );

  try {
    const messageId = useResendApi
      ? await sendResendApi(mail)
      : await sendSmtp(mail, { log: false });

    console.log(
      JSON.stringify({
        event: "email.sent",
        provider: env.smtp.provider,
        transport,
        from: mail.from,
        to: mail.to,
        subject: mail.subject,
        messageId,
        durationMs: Date.now() - startedAt,
      }),
    );

    return messageId;
  } catch (err) {
    console.error(
      JSON.stringify({
        event: "email.failed",
        provider: env.smtp.provider,
        transport,
        from: mail.from,
        to: mail.to,
        subject: mail.subject,
        error: formatSendError(err),
        durationMs: Date.now() - startedAt,
      }),
    );
    throw err;
  }
}

export async function deliverMessage(message: Message): Promise<string> {
  return sendMail({
    from: message.fromEmail,
    to: message.toEmail,
    subject: message.subject,
    text: message.textBody ?? undefined,
    html: message.htmlBody ?? undefined,
  });
}
