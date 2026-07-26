import { env } from "./config/env";
import { prisma } from "./db/prisma";
import { startOutboxWorker } from "./worker/outbox-worker";

if (env.WORKER_EMBEDDED) {
  console.warn(
    JSON.stringify({
      event: "worker.standalone_with_embedded_enabled",
      message:
        "WORKER_EMBEDDED=true — API already runs the outbox. Set WORKER_EMBEDDED=false when using a separate worker process.",
    }),
  );
}

const worker = startOutboxWorker({ embedded: false });

async function shutdown() {
  worker.stop();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
