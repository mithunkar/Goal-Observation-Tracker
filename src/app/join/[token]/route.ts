import { NextResponse, type NextRequest } from "next/server";

import { setPendingInvitationToken } from "@/auth/invitation-cookie";
import { isValidInvitationToken } from "@/auth/invitation-token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isValidInvitationToken(token)) {
    return NextResponse.redirect(
      new URL("/access-denied?reason=invalid_invitation", request.url),
    );
  }

  await setPendingInvitationToken(token);
  return NextResponse.redirect(new URL("/auth/invitation", request.url));
}
