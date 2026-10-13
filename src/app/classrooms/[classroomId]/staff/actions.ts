"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import {
  createClassroomInvitation,
  InvitationError,
  regenerateClassroomInvitation,
  revokeClassroomInvitation,
} from "@/db/queries/invitations";

export type InvitationActionState = {
  error: string | null;
  link: string | null;
};

const invitationSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(["TEACHER", "ASSISTANT"]),
});

function invitationLink(token: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required to create invitations.");
  }
  return `${siteUrl.replace(/\/$/, "")}/join/${token}`;
}

export async function createInvitationAction(
  classroomId: string,
  previousState: InvitationActionState,
  formData: FormData,
): Promise<InvitationActionState> {
  void previousState;
  const parsedInvitation = invitationSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsedInvitation.success) {
    return { error: parsedInvitation.error.issues[0].message, link: null };
  }

  const identity = await requireCurrentApplicationIdentity(classroomId);
  const { db } = await import("@/db/client");
  try {
    const invitation = await createClassroomInvitation(
      db,
      identity,
      parsedInvitation.data.email,
      parsedInvitation.data.role,
    );
    revalidatePath(classroomPath(classroomId, "/staff"));
    return { error: null, link: invitationLink(invitation.token) };
  } catch (error) {
    if (error instanceof InvitationError) {
      return { error: error.message, link: null };
    }
    throw error;
  }
}

export async function revokeInvitationAction(
  classroomId: string,
  invitationId: string,
) {
  const identity = await requireCurrentApplicationIdentity(classroomId);
  const { db } = await import("@/db/client");
  await revokeClassroomInvitation(db, identity, invitationId);
  revalidatePath(classroomPath(classroomId, "/staff"));
}

export async function regenerateInvitationAction(
  classroomId: string,
  invitationId: string,
  previousState: InvitationActionState,
): Promise<InvitationActionState> {
  void previousState;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  const { db } = await import("@/db/client");
  try {
    const invitation = await regenerateClassroomInvitation(
      db,
      identity,
      invitationId,
    );
    revalidatePath(classroomPath(classroomId, "/staff"));
    return { error: null, link: invitationLink(invitation.token) };
  } catch (error) {
    if (error instanceof InvitationError) {
      return { error: error.message, link: null };
    }
    throw error;
  }
}
