import { NextResponse, type NextRequest } from "next/server";

import { provisionGoogleUser } from "@/auth/application-session";
import {
  clearPendingInvitationToken,
  getPendingInvitationToken,
} from "@/auth/invitation-cookie";
import { InvitationError } from "@/db/queries/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=google", request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=google", request.url));
  }

  const invitationToken = await getPendingInvitationToken();
  let identity = null;
  try {
    identity = await provisionGoogleUser(data.user, invitationToken);
  } catch (provisioningError) {
    await clearPendingInvitationToken();
    if (provisioningError instanceof InvitationError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL(`/access-denied?reason=${provisioningError.code.toLowerCase()}`, request.url),
      );
    }
    throw provisioningError;
  }
  await clearPendingInvitationToken();
  if (!identity) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/access-denied", request.url));
  }

  return NextResponse.redirect(
    new URL(`/classrooms/${identity.workspaceId}/dashboard`, request.url),
  );
}
