import type { Message } from "@prisma/client";
import { sendSmtp } from "./smtp-client";

export async function deliverMessage(message: Message): Promise<string> {
  return sendSmtp({
    from: message.fromEmail,
    to: message.toEmail,
    subject: message.subject,
    text: message.textBody ?? undefined,
    html: message.htmlBody ?? undefined,
  });
}
