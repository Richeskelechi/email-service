import type { ApiKeyMode } from "@prisma/client";

export type IssuedApiKey = {
  id: string;
  name: string;
  mode: ApiKeyMode;
  keyPrefix: string;
  secret: string;
  organizationId: string;
};
