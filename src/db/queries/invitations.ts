import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "@/auth/invitation-token";
import {
  AuthorizationError,
  canInviteMembers,
  type AuthorizationActor,
} from "@/auth/authorization";
import {
  classroomInvitations,
  classroomMemberships,
  users,
  workspaces,
} from "@/db/schema";
import { normalizeEmail } from "@/db/queries/users";

export type VerifiedInvitationUser = {
  id: string;
  email: string;
  displayName: string;
};

export type ClassroomRole = "TEACHER" | "ASSISTANT";

export class InvitationError extends Error {
  constructor(
    readonly code:
      | "ALREADY_MEMBER"
      | "INVALID_INVITATION"
      | "EMAIL_MISMATCH",
    message: string,
  ) {
    super(message);
    this.name = "InvitationError";
  }
}

const identitySelection = {
  id: users.id,
  workspaceId: classroomMemberships.workspaceId,
  workspaceName: workspaces.name,
  displayName: users.displayName,
  email: users.email,
  role: classroomMemberships.role,
  status: classroomMemberships.status,
};

export async function listClassroomStaff(
  database: NodePgDatabase,
  actor: AuthorizationActor,
) {
  if (actor.status !== "ACTIVE") {
    throw new AuthorizationError();
  }

  const [members, invitations] = await Promise.all([
    database
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        role: classroomMemberships.role,
        status: classroomMemberships.status,
        joinedAt: classroomMemberships.joinedAt,
      })
      .from(classroomMemberships)
      .innerJoin(users, eq(users.id, classroomMemberships.userId))
      .where(eq(classroomMemberships.workspaceId, actor.workspaceId)),
    database
      .select({
        id: classroomInvitations.id,
        email: classroomInvitations.email,
        role: classroomInvitations.role,
        expiresAt: classroomInvitations.expiresAt,
        createdAt: classroomInvitations.createdAt,
      })
      .from(classroomInvitations)
      .where(
        and(
          eq(classroomInvitations.workspaceId, actor.workspaceId),
          eq(classroomInvitations.status, "PENDING"),
          gt(classroomInvitations.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(classroomInvitations.createdAt)),
  ]);

  return { members, invitations };
}

async function assertEmailIsNotMember(
  database: NodePgDatabase,
  workspaceId: string,
  email: string,
) {
  const [member] = await database
    .select({ id: users.id })
    .from(users)
    .innerJoin(
      classroomMemberships,
      and(
        eq(classroomMemberships.userId, users.id),
        eq(classroomMemberships.workspaceId, workspaceId),
      ),
    )
    .where(eq(users.email, email))
    .limit(1);

  if (member) {
    throw new InvitationError(
      "ALREADY_MEMBER",
      "That email already belongs to this classroom.",
    );
  }
}

export async function createClassroomInvitation(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  emailInput: string,
  role: ClassroomRole,
  now = new Date(),
) {
  if (!canInviteMembers(actor)) {
    throw new AuthorizationError();
  }

  const email = normalizeEmail(emailInput);
  await assertEmailIsNotMember(database, actor.workspaceId, email);
  const token = createInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = invitationExpiresAt(now);

  const invitation = await database.transaction(async (transaction) => {
    await transaction
      .update(classroomInvitations)
      .set({ status: "REVOKED", revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(classroomInvitations.workspaceId, actor.workspaceId),
          eq(classroomInvitations.email, email),
          eq(classroomInvitations.status, "PENDING"),
        ),
      );

    const [created] = await transaction
      .insert(classroomInvitations)
      .values({
        workspaceId: actor.workspaceId,
        email,
        role,
        tokenHash,
        invitedByUserId: actor.id,
        expiresAt,
      })
      .returning({
        id: classroomInvitations.id,
        email: classroomInvitations.email,
        expiresAt: classroomInvitations.expiresAt,
      });
    return created;
  });

  return { ...invitation, token };
}

export async function revokeClassroomInvitation(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  invitationId: string,
  now = new Date(),
) {
  if (!canInviteMembers(actor)) {
    throw new AuthorizationError();
  }

  const [revoked] = await database
    .update(classroomInvitations)
    .set({ status: "REVOKED", revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(classroomInvitations.id, invitationId),
        eq(classroomInvitations.workspaceId, actor.workspaceId),
        eq(classroomInvitations.status, "PENDING"),
      ),
    )
    .returning({ id: classroomInvitations.id });
  return revoked ?? null;
}

export async function regenerateClassroomInvitation(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  invitationId: string,
) {
  if (!canInviteMembers(actor)) {
    throw new AuthorizationError();
  }

  const [invitation] = await database
    .select({
      email: classroomInvitations.email,
      role: classroomInvitations.role,
    })
    .from(classroomInvitations)
    .where(
      and(
        eq(classroomInvitations.id, invitationId),
        eq(classroomInvitations.workspaceId, actor.workspaceId),
        eq(classroomInvitations.status, "PENDING"),
      ),
    )
    .limit(1);

  if (!invitation) {
    throw new InvitationError(
      "INVALID_INVITATION",
      "That invitation is no longer available.",
    );
  }

  return createClassroomInvitation(
    database,
    actor,
    invitation.email,
    invitation.role,
  );
}

async function upsertVerifiedAccount(
  database: NodePgDatabase,
  user: VerifiedInvitationUser,
) {
  const email = normalizeEmail(user.email);
  const [emailOwner] = await database
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (emailOwner && emailOwner.id !== user.id) {
    throw new InvitationError(
      "EMAIL_MISMATCH",
      "That email is already connected to another account.",
    );
  }

  await database
    .insert(users)
    .values({ id: user.id, email, displayName: user.displayName })
    .onConflictDoUpdate({
      target: users.id,
      set: { email, displayName: user.displayName, updatedAt: new Date() },
    });
}

export async function acceptClassroomInvitation(
  database: NodePgDatabase,
  token: string,
  user: VerifiedInvitationUser,
  now = new Date(),
) {
  const tokenHash = hashInvitationToken(token);
  const normalizedEmail = normalizeEmail(user.email);

  return database.transaction(async (transaction) => {
    const [invitation] = await transaction
      .select({
        id: classroomInvitations.id,
        workspaceId: classroomInvitations.workspaceId,
        email: classroomInvitations.email,
        role: classroomInvitations.role,
      })
      .from(classroomInvitations)
      .where(
        and(
          eq(classroomInvitations.tokenHash, tokenHash),
          eq(classroomInvitations.status, "PENDING"),
          gt(classroomInvitations.expiresAt, now),
        ),
      )
      .limit(1);

    if (!invitation) {
      throw new InvitationError(
        "INVALID_INVITATION",
        "That invitation is invalid, expired, or has already been used.",
      );
    }
    if (invitation.email !== normalizedEmail) {
      throw new InvitationError(
        "EMAIL_MISMATCH",
        `Sign in with ${invitation.email} to accept this invitation.`,
      );
    }

    await upsertVerifiedAccount(transaction, user);
    const [claimed] = await transaction
      .update(classroomInvitations)
      .set({
        status: "ACCEPTED",
        acceptedByUserId: user.id,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(classroomInvitations.id, invitation.id),
          eq(classroomInvitations.status, "PENDING"),
        ),
      )
      .returning({ id: classroomInvitations.id });

    if (!claimed) {
      throw new InvitationError(
        "INVALID_INVITATION",
        "That invitation has already been used.",
      );
    }

    await transaction
      .insert(classroomMemberships)
      .values({
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    const [identity] = await transaction
      .select(identitySelection)
      .from(users)
      .innerJoin(
        classroomMemberships,
        eq(classroomMemberships.userId, users.id),
      )
      .innerJoin(workspaces, eq(workspaces.id, classroomMemberships.workspaceId))
      .where(
        and(
          eq(users.id, user.id),
          eq(classroomMemberships.workspaceId, invitation.workspaceId),
        ),
      )
      .limit(1);
    return identity ?? null;
  });
}

export async function acceptLegacyClassroomInvitation(
  database: NodePgDatabase,
  user: VerifiedInvitationUser,
  now = new Date(),
) {
  const normalizedEmail = normalizeEmail(user.email);

  return database.transaction(async (transaction) => {
    const [invitation] = await transaction
      .select({
        id: classroomInvitations.id,
        workspaceId: classroomInvitations.workspaceId,
        role: classroomInvitations.role,
      })
      .from(classroomInvitations)
      .where(
        and(
          eq(classroomInvitations.email, normalizedEmail),
          eq(classroomInvitations.status, "PENDING"),
          isNull(classroomInvitations.tokenHash),
          or(
            isNull(classroomInvitations.expiresAt),
            gt(classroomInvitations.expiresAt, now),
          ),
        ),
      )
      .limit(1);

    if (!invitation) {
      return null;
    }

    await upsertVerifiedAccount(transaction, user);
    const [claimed] = await transaction
      .update(classroomInvitations)
      .set({
        status: "ACCEPTED",
        acceptedByUserId: user.id,
        acceptedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(classroomInvitations.id, invitation.id),
          eq(classroomInvitations.status, "PENDING"),
        ),
      )
      .returning({ id: classroomInvitations.id });

    if (!claimed) {
      return null;
    }

    await transaction
      .insert(classroomMemberships)
      .values({
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role,
        status: "ACTIVE",
      })
      .onConflictDoNothing();

    const [identity] = await transaction
      .select(identitySelection)
      .from(users)
      .innerJoin(
        classroomMemberships,
        eq(classroomMemberships.userId, users.id),
      )
      .innerJoin(workspaces, eq(workspaces.id, classroomMemberships.workspaceId))
      .where(
        and(
          eq(users.id, user.id),
          eq(classroomMemberships.workspaceId, invitation.workspaceId),
        ),
      )
      .limit(1);
    return identity ?? null;
  });
}
