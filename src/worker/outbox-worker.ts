import type { Message } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { deliverMessage } from "../mail/deliver";
import { describeMailTransport } from "../mail/smtp-client";

type StoredRecipient = {
  to: string;
  subject?: string;
  text?: string;
  html?: string;
};

async function fanOutBatches(): Promise<number> {
  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH next AS (
      SELECT id
      FROM email_batches
      WHERE status = 'pending_fanout'::"BatchStatus"
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE email_batches b
    SET status = 'expanding'::"BatchStatus", updated_at = NOW()
    FROM next
    WHERE b.id = next.id
    RETURNING b.id
  `;

  if (claimed.length === 0) return 0;

  const batchId = claimed[0]!.id;
  const batch = await prisma.emailBatch.findUnique({ where: { id: batchId } });
  if (!batch) return 0;

  const recipients = batch.recipients as StoredRecipient[];
  let fannedOut = batch.fannedOut;

  while (fannedOut < batch.total) {
    const chunk = recipients.slice(fannedOut, fannedOut + env.WORKER_FANOUT_CHUNK);
    if (chunk.length === 0) break;

    await prisma.message.createMany({
      data: chunk.map((r) => ({
        organizationId: batch.organizationId,
        apiKeyId: batch.apiKeyId,
        batchId: batch.id,
        mode: batch.mode,
        status: "accepted" as const,
        fromEmail: batch.fromEmail,
        toEmail: r.to,
        subject: r.subject ?? batch.subject,
        textBody: r.text ?? batch.textBody,
        htmlBody: r.html ?? batch.htmlBody,
      })),
    });

    fannedOut += chunk.length;
    await prisma.emailBatch.update({
      where: { id: batch.id },
      data: { fannedOut },
    });
  }

  await prisma.emailBatch.update({
    where: { id: batch.id },
    data: { status: "ready", fannedOut: batch.total },
  });

  console.log(
    JSON.stringify({
      event: "batch.fanout.complete",
      batchId: batch.id,
      total: batch.total,
    }),
  );

  return 1;
}

async function claimAcceptedMessages(limit: number): Promise<Message[]> {
  const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
    WITH next AS (
      SELECT id
      FROM messages
      WHERE status = 'accepted'::"MessageStatus"
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE messages m
    SET
      status = 'sending'::"MessageStatus",
      attempts = m.attempts + 1,
      updated_at = NOW()
    FROM next
    WHERE m.id = next.id
    RETURNING m.id
  `;

  if (claimed.length === 0) return [];

  return prisma.message.findMany({
    where: { id: { in: claimed.map((row) => row.id) } },
    orderBy: { createdAt: "asc" },
  });
}

async function deliverOne(message: Message): Promise<void> {
  try {
    if (message.mode === "test") {
      const providerId = `sim_${message.id}`;
      console.log(
        JSON.stringify({
          event: "email.simulated",
          id: message.id,
          organizationId: message.organizationId,
          from: message.fromEmail,
          to: message.toEmail,
          subject: message.subject,
          hasText: Boolean(message.textBody),
          hasHtml: Boolean(message.htmlBody),
        }),
      );

      await prisma.message.update({
        where: { id: message.id },
        data: {
          status: "simulated",
          providerId,
          sentAt: new Date(),
          errorMessage: null,
        },
      });
      return;
    }

    const providerId = await deliverMessage(message);
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: "sent",
        providerId,
        sentAt: new Date(),
        errorMessage: null,
      },
    });
    console.log(
      JSON.stringify({
        event: "email.delivered",
        id: message.id,
        organizationId: message.organizationId,
        mode: message.mode,
        from: message.fromEmail,
        to: message.toEmail,
        subject: message.subject,
        providerId,
        status: "sent",
      }),
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.message.update({
      where: { id: message.id },
      data: { status: "failed", errorMessage },
    });
    console.error(
      JSON.stringify({
        event: "email.delivery_failed",
        id: message.id,
        organizationId: message.organizationId,
        mode: message.mode,
        from: message.fromEmail,
        to: message.toEmail,
        subject: message.subject,
        status: "failed",
        error: errorMessage,
      }),
    );
  }
}

async function deliverMessages(): Promise<number> {
  const claimed = await claimAcceptedMessages(env.WORKER_BATCH_SIZE);
  if (claimed.length === 0) return 0;

  const concurrency = Math.max(1, env.WORKER_CONCURRENCY);
  for (let i = 0; i < claimed.length; i += concurrency) {
    const slice = claimed.slice(i, i + concurrency);
    await Promise.all(slice.map((m) => deliverOne(m)));
  }

  return claimed.length;
}

async function tick(): Promise<void> {
  await fanOutBatches();
  await deliverMessages();
}

export type OutboxWorkerHandle = {
  stop: () => void;
};

/** Starts the outbox poll loop. Safe with multiple processes (SKIP LOCKED). */
export function startOutboxWorker(options?: {
  embedded?: boolean;
}): OutboxWorkerHandle {
  let stopped = false;

  console.log(
    JSON.stringify({
      event: "worker.started",
      embedded: Boolean(options?.embedded),
      nodeEnv: env.NODE_ENV,
      pollMs: env.WORKER_POLL_MS,
      smtp: describeMailTransport(),
      batchSize: env.WORKER_BATCH_SIZE,
      concurrency: env.WORKER_CONCURRENCY,
      fanoutChunk: env.WORKER_FANOUT_CHUNK,
    }),
  );

  const run = async () => {
    while (!stopped) {
      try {
        await tick();
      } catch (err) {
        console.error("worker tick error", err);
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(err.message);
        }
      }
      if (stopped) break;
      await new Promise((r) => setTimeout(r, env.WORKER_POLL_MS));
    }
  };

  void run();

  return {
    stop: () => {
      stopped = true;
      console.log(JSON.stringify({ event: "worker.stopping" }));
    },
  };
}
