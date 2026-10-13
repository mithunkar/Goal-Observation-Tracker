import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { AuthorizationActor } from "@/auth/authorization";
import {
  acceptClassroomInvitation,
  acceptLegacyClassroomInvitation,
} from "@/db/queries/invitations";
import {
  findApplicationUser,
  listApplicationMemberships,
} from "@/db/queries/users";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApplicationIdentity = AuthorizationActor & {
  workspaceName: string;
  displayName: string;
  email: string;
};

type VerifiedSupabaseUser = {
  id: string;
  email: string;
};

const valueAsString = (value: unknown) =>
  typeof value === "string" ? value : null;

export const getVerifiedSupabaseUser = cache(
  async (): Promise<VerifiedSupabaseUser | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const id = valueAsString(claims?.sub);
    const email = valueAsString(claims?.email);

    if (error || !id || !email) {
      return null;
    }

    return { id, email };
  },
);

export const getApplicationMemberships = cache(
  async (): Promise<ApplicationIdentity[]> => {
    const supabaseUser = await getVerifiedSupabaseUser();
    if (!supabaseUser || !process.env.DATABASE_URL) {
      return [];
    }

    const { db } = await import("@/db/client");
    return listApplicationMemberships(db, supabaseUser.id);
  },
);

export const getCurrentApplicationIdentity = cache(
  async (workspaceId?: string): Promise<ApplicationIdentity | null> => {
    const supabaseUser = await getVerifiedSupabaseUser();
    if (!supabaseUser || !process.env.DATABASE_URL) {
      return null;
    }

    const { db } = await import("@/db/client");
    if (workspaceId) {
      const identity = await findApplicationUser(
        db,
        supabaseUser.id,
        workspaceId,
      );
      return identity?.status === "ACTIVE" ? identity : null;
    }

    const memberships = await listApplicationMemberships(db, supabaseUser.id);
    const activeMemberships = memberships.filter(
      (membership) => membership.status === "ACTIVE",
    );
    return activeMemberships.length === 1 ? activeMemberships[0] : null;
  },
);

export async function requireCurrentApplicationIdentity(
  workspaceId?: string,
): Promise<ApplicationIdentity> {
  const supabaseUser = await getVerifiedSupabaseUser();
  if (!supabaseUser) {
    redirect("/sign-in");
  }

  const identity = await getCurrentApplicationIdentity(workspaceId);
  if (!identity) {
    redirect(workspaceId ? "/access-denied?reason=classroom" : "/classrooms");
  }

  return identity;
}

function googleDisplayName(user: User) {
  const metadata = user.user_metadata ?? {};
  return (
    valueAsString(metadata.full_name)?.trim() ||
    valueAsString(metadata.name)?.trim() ||
    user.email?.split("@")[0] ||
    "Classroom staff"
  );
}

/** Provisions or joins classrooms after Supabase verifies the Google account. */
export async function provisionGoogleUser(
  user: User | null,
  invitationToken?: string | null,
): Promise<ApplicationIdentity | null> {
  if (
    !user?.email ||
    user.app_metadata?.provider !== "google" ||
    !process.env.DATABASE_URL
  ) {
    return null;
  }

  const verifiedUser = {
    id: user.id,
    email: user.email,
    displayName: googleDisplayName(user),
  };
  const { db } = await import("@/db/client");

  if (invitationToken) {
    return acceptClassroomInvitation(db, invitationToken, verifiedUser);
  }

  const memberships = await listApplicationMemberships(db, user.id);
  const activeMembership = memberships.find(
    (membership) => membership.status === "ACTIVE",
  );
  if (activeMembership) {
    return activeMembership;
  }

  return acceptLegacyClassroomInvitation(db, verifiedUser);
}
