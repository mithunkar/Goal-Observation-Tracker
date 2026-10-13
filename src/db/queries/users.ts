import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  classroomMemberships,
  users,
  workspaces,
} from "@/db/schema";

const applicationIdentitySelection = {
  id: users.id,
  workspaceId: classroomMemberships.workspaceId,
  workspaceName: workspaces.name,
  displayName: users.displayName,
  email: users.email,
  role: classroomMemberships.role,
  status: classroomMemberships.status,
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildApplicationUserQuery(
  database: NodePgDatabase,
  userId: string,
  workspaceId: string,
) {
  return database
    .select(applicationIdentitySelection)
    .from(users)
    .innerJoin(
      classroomMemberships,
      eq(classroomMemberships.userId, users.id),
    )
    .innerJoin(workspaces, eq(workspaces.id, classroomMemberships.workspaceId))
    .where(
      and(
        eq(users.id, userId),
        eq(classroomMemberships.workspaceId, workspaceId),
      ),
    )
    .limit(1);
}

export async function findApplicationUser(
  database: NodePgDatabase,
  userId: string,
  workspaceId: string,
) {
  const [user] = await buildApplicationUserQuery(database, userId, workspaceId);
  return user ?? null;
}

export async function listApplicationMemberships(
  database: NodePgDatabase,
  userId: string,
) {
  return database
    .select(applicationIdentitySelection)
    .from(users)
    .innerJoin(
      classroomMemberships,
      eq(classroomMemberships.userId, users.id),
    )
    .innerJoin(workspaces, eq(workspaces.id, classroomMemberships.workspaceId))
    .where(eq(users.id, userId));
}

export async function findWorkspaceTimezone(
  database: NodePgDatabase,
  workspaceId: string,
) {
  const [workspace] = await database
    .select({ timezone: workspaces.timezone })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return workspace?.timezone ?? "America/Los_Angeles";
}
