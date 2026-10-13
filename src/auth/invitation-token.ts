import { createHash, randomBytes } from "node:crypto";

export const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function createInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + INVITATION_LIFETIME_MS);
}

export function isValidInvitationToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
