import "server-only";

import { cookies } from "next/headers";

import { INVITATION_LIFETIME_MS } from "@/auth/invitation-token";

const INVITATION_COOKIE = "evidence-loop-invitation";

export async function getPendingInvitationToken() {
  return (await cookies()).get(INVITATION_COOKIE)?.value ?? null;
}

export async function setPendingInvitationToken(token: string) {
  (await cookies()).set(INVITATION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITATION_LIFETIME_MS / 1000,
  });
}

export async function clearPendingInvitationToken() {
  (await cookies()).delete(INVITATION_COOKIE);
}
