import { HttpException, HttpStatus } from "@nestjs/common";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

export async function assertOrgSendQuota(
  organizationId: string,
  additional: number,
): Promise<void> {
  const since = new Date(Date.now() - 60_000);

  const [recentMessages, pendingBatches] = await Promise.all([
    prisma.message.count({
      where: {
        organizationId,
        createdAt: { gte: since },
      },
    }),
    prisma.emailBatch.findMany({
      where: {
        organizationId,
        status: { in: ["pending_fanout", "expanding"] },
      },
      select: { total: true, fannedOut: true },
    }),
  ]);

  const pendingFanout = pendingBatches.reduce(
    (sum, b) => sum + Math.max(0, b.total - b.fannedOut),
    0,
  );

  const projected = recentMessages + pendingFanout + additional;
  if (projected > env.ORG_RATE_LIMIT_PER_MINUTE) {
    throw new HttpException(
      {
        error: "rate_limited",
        limitPerMinute: env.ORG_RATE_LIMIT_PER_MINUTE,
        used: recentMessages + pendingFanout,
        requested: additional,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
