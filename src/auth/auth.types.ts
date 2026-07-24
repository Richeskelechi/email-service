import type { ApiKeyMode } from "@prisma/client";

export type AuthContext = {
  organizationId: string;
  apiKeyId: string;
  mode: ApiKeyMode;
};

export type AuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; status: number; error: string };

/** Authenticated dashboard/session user (Bearer session token). */
export type SessionUser = {
  sessionId: string;
  userId: string;
  organizationId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  permissionKeys: string[];
};
