import type { ApiKeyMode } from "@prisma/client";

export type AuthContext = {
  organizationId: string;
  apiKeyId: string;
  mode: ApiKeyMode;
};

export type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: number; error: string };
