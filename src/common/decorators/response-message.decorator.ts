import { SetMetadata } from "@nestjs/common";

export const RESPONSE_MESSAGE_KEY = "response_message";

/** Optional human-readable success message for the standard envelope. */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
