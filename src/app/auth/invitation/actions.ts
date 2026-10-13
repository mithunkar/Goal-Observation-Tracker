"use server";

import { redirect } from "next/navigation";

import { provisionGoogleUser } from "@/auth/application-session";
import {
  clearPendingInvitationToken,
  getPendingInvitationToken,
} from "@/auth/invitation-cookie";
import { InvitationError } from "@/db/queries/invitations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function acceptPendingInvitation() {
  const token = await getPendingInvitationToken();
  if (!token) {
    redirect("/access-denied?reason=invalid_invitation");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/sign-in");
  }

  try {
    const identity = await provisionGoogleUser(data.user, token);
    await clearPendingInvitationToken();
    if (!identity) {
      redirect("/access-denied?reason=invalid_invitation");
    }
    redirect(`/classrooms/${identity.workspaceId}/dashboard`);
  } catch (invitationError) {
    await clearPendingInvitationToken();
    if (invitationError instanceof InvitationError) {
      redirect(
        `/access-denied?reason=${invitationError.code.toLowerCase()}`,
      );
    }
    throw invitationError;
  }
}
