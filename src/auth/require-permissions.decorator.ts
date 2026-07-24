import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

/** Require all listed permission keys (super admin bypasses). */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
