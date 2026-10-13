import { describe, expect, it } from "vitest";

import {
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isValidInvitationToken,
} from "@/auth/invitation-token";

describe("classroom invitation tokens", () => {
  it("creates URL-safe 256-bit tokens and stores only a stable digest", () => {
    const token = createInvitationToken();
    expect(isValidInvitationToken(token)).toBe(true);
    expect(token).toHaveLength(43);
    expect(hashInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken(token)).toBe(hashInvitationToken(token));
  });

  it("expires invitations seven days after creation", () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    expect(invitationExpiresAt(now).toISOString()).toBe(
      "2026-10-18T12:00:00.000Z",
    );
  });

  it("rejects malformed link tokens", () => {
    expect(isValidInvitationToken("too-short")).toBe(false);
    expect(isValidInvitationToken("!".repeat(43))).toBe(false);
  });
});
