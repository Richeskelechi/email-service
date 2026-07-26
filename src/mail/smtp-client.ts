import { createConnection, type Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { randomBytes } from "node:crypto";
import { env } from "../config/env";

export type OutboundMail = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

function assertNoCrlf(value: string, field: string): void {
  if (/[\r\n]/.test(value)) {
    throw new Error(`invalid_${field}`);
  }
}

function encodeSubject(subject: string): string {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;
}

export function buildMimeMessage(mail: OutboundMail): {
  raw: string;
  messageId: string;
} {
  assertNoCrlf(mail.from, "from");
  assertNoCrlf(mail.to, "to");
  assertNoCrlf(mail.subject, "subject");

  const messageId = `<${randomBytes(16).toString("hex")}@localhost>`;
  const date = new Date().toUTCString();
  const hasText = Boolean(mail.text);
  const hasHtml = Boolean(mail.html);

  const headers = [
    `From: ${mail.from}`,
    `To: ${mail.to}`,
    `Subject: ${encodeSubject(mail.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
  ];

  let body: string;

  if (hasText && hasHtml) {
    const boundary = `b_${randomBytes(12).toString("hex")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    body = [
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      mail.text,
      `--${boundary}`,
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      mail.html,
      `--${boundary}--`,
      "",
    ].join("\r\n");
  } else if (hasHtml) {
    headers.push("Content-Type: text/html; charset=utf-8");
    headers.push("Content-Transfer-Encoding: 8bit");
    body = `${mail.html}\r\n`;
  } else {
    headers.push("Content-Type: text/plain; charset=utf-8");
    headers.push("Content-Transfer-Encoding: 8bit");
    body = `${mail.text ?? ""}\r\n`;
  }

  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return { raw, messageId };
}

class SmtpSession {
  private buffer = "";
  private waiters: Array<{
    resolve: (value: string) => void;
    reject: (err: Error) => void;
  }> = [];

  constructor(private socket: Socket | TLSSocket) {
    this.socket.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8");
      this.flush();
    });
    this.socket.on("error", (err: Error) => {
      const waiters = this.waiters.splice(0);
      for (const w of waiters) w.reject(err);
    });
  }

  setSocket(socket: Socket | TLSSocket): void {
    this.socket.removeAllListeners("data");
    this.socket.removeAllListeners("error");
    this.socket = socket;
    this.buffer = "";
    this.socket.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8");
      this.flush();
    });
    this.socket.on("error", (err: Error) => {
      const waiters = this.waiters.splice(0);
      for (const w of waiters) w.reject(err);
    });
  }

  async greeting(): Promise<void> {
    await this.readResponse();
  }

  async command(cmd: string, expect: number | number[] = 250): Promise<string> {
    this.socket.write(`${cmd}\r\n`);
    const response = await this.readResponse();
    const code = Number(response.slice(0, 3));
    const allowed = Array.isArray(expect) ? expect : [expect];
    if (!allowed.includes(code)) {
      throw new Error(`smtp_error: ${response.trim()}`);
    }
    return response;
  }

  async data(raw: string): Promise<void> {
    await this.command("DATA", 354);
    const normalized = raw.replace(/\r?\n/g, "\r\n").replace(/\r\n$/, "");
    const escaped = normalized.replace(/(^|\r\n)\./g, "$1..");
    this.socket.write(`${escaped}\r\n.\r\n`);
    const response = await this.readResponse();
    const code = Number(response.slice(0, 3));
    if (code !== 250) {
      throw new Error(`smtp_data_error: ${response.trim()}`);
    }
  }

  async authLogin(user: string, pass: string): Promise<void> {
    await this.command("AUTH LOGIN", 334);
    await this.command(Buffer.from(user, "utf8").toString("base64"), 334);
    await this.command(Buffer.from(pass, "utf8").toString("base64"), 235);
  }

  async startTlsUpgrade(host: string): Promise<void> {
    await this.command("STARTTLS", 220);
    const plain = this.socket as Socket;
    const tlsSocket = await new Promise<TLSSocket>((resolve, reject) => {
      const upgraded = tlsConnect(
        {
          socket: plain,
          host,
          servername: host,
        },
        () => {
          upgraded.off("error", reject);
          resolve(upgraded);
        },
      );
      upgraded.once("error", reject);
    });
    this.setSocket(tlsSocket);
  }

  private flush(): void {
    while (this.waiters.length > 0) {
      const lines: string[] = [];
      let consumed = 0;
      let complete = false;
      const parts = this.buffer.split("\r\n");

      for (let i = 0; i < parts.length - 1; i++) {
        const line = parts[i]!;
        lines.push(line);
        consumed += line.length + 2;
        if (/^\d{3} /.test(line)) {
          complete = true;
          break;
        }
      }

      if (!complete) return;

      this.buffer = this.buffer.slice(consumed);
      const waiter = this.waiters.shift()!;
      waiter.resolve(lines.join("\r\n"));
    }
  }

  private readResponse(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
      this.flush();
    });
  }

  end(): void {
    this.socket.end();
  }
}

function connectSocket(): Promise<Socket | TLSSocket> {
  const { host, port, secure } = env.smtp;

  return new Promise((resolve, reject) => {
    const onError = (err: Error) => reject(err);

    if (secure) {
      const socket = tlsConnect(
        { host, port, servername: host },
        () => {
          socket.off("error", onError);
          resolve(socket);
        },
      );
      socket.once("error", onError);
      return;
    }

    const socket = createConnection({ host, port }, () => {
      socket.off("error", onError);
      resolve(socket);
    });
    socket.once("error", onError);
  });
}

export async function sendSmtp(
  mail: OutboundMail,
  options?: { log?: boolean },
): Promise<string> {
  const log = options?.log !== false;
  const transport = describeMailTransport();
  const startedAt = Date.now();

  if (log) {
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
  }

  try {
    const { raw, messageId } = buildMimeMessage(mail);
    const socket = await connectSocket();
    const session = new SmtpSession(socket);
    const { host, startTls, user, pass } = env.smtp;

    try {
      await session.greeting();
      await session.command(`EHLO localhost`);

      if (startTls && !env.smtp.secure) {
        await session.startTlsUpgrade(host);
        await session.command(`EHLO localhost`);
      }

      if (user && pass) {
        await session.authLogin(user, pass);
      }

      await session.command(`MAIL FROM:<${mail.from}>`);
      await session.command(`RCPT TO:<${mail.to}>`);
      await session.data(raw);
      await session.command("QUIT", 221);

      if (log) {
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
      }

      return messageId;
    } finally {
      session.end();
    }
  } catch (err) {
    if (log) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(
        JSON.stringify({
          event: "email.failed",
          provider: env.smtp.provider,
          transport,
          from: mail.from,
          to: mail.to,
          subject: mail.subject,
          error,
          durationMs: Date.now() - startedAt,
        }),
      );
    }
    throw err;
  }
}

export function describeMailTransport(): string {
  const s = env.smtp;
  if (s.provider === "resend") {
    return "resend https://api.resend.com (https api)";
  }
  const auth = s.user ? `auth=${s.user}` : "auth=none";
  const tls = s.secure ? "tls=implicit" : s.startTls ? "tls=starttls" : "tls=off";
  return `${s.provider} ${s.host}:${s.port} (${tls}, ${auth})`;
}
