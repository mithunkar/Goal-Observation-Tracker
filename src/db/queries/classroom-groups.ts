import { and, asc, eq, max } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  AuthorizationError,
  canManageGroups,
  type AuthorizationActor,
} from "@/auth/authorization";
import { classroomGroups } from "@/db/schema";
import type { CreateClassroomGroupInput } from "@/domain/classroom-group";

const classroomGroupSelection = {
  key: classroomGroups.key,
  name: classroomGroups.name,
  position: classroomGroups.position,
};

export function buildClassroomGroupListQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
) {
  return database
    .select(classroomGroupSelection)
    .from(classroomGroups)
    .where(eq(classroomGroups.workspaceId, actor.workspaceId))
    .orderBy(asc(classroomGroups.position), asc(classroomGroups.name));
}

export async function listClassroomGroups(
  database: NodePgDatabase,
  actor: AuthorizationActor,
) {
  if (actor.status !== "ACTIVE") return [];
  return buildClassroomGroupListQuery(database, actor);
}

export function buildCreateClassroomGroupQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  input: CreateClassroomGroupInput,
  key: string,
  position: number,
) {
  if (!canManageGroups(actor)) throw new AuthorizationError();

  return database
    .insert(classroomGroups)
    .values({
      workspaceId: actor.workspaceId,
      key,
      name: input.name,
      position,
      createdByUserId: actor.id,
    })
    .returning(classroomGroupSelection);
}

export async function createClassroomGroup(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  input: CreateClassroomGroupInput,
) {
  if (!canManageGroups(actor)) throw new AuthorizationError();

  return database.transaction(async (transaction) => {
    const [positionResult] = await transaction
      .select({ maximum: max(classroomGroups.position) })
      .from(classroomGroups)
      .where(eq(classroomGroups.workspaceId, actor.workspaceId));

    const [group] = await buildCreateClassroomGroupQuery(
      transaction,
      actor,
      input,
      crypto.randomUUID(),
      (positionResult?.maximum ?? -1) + 1,
    );

    return group;
  });
}

export async function classroomGroupExists(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  groupKey: string,
) {
  const [group] = await database
    .select({ key: classroomGroups.key })
    .from(classroomGroups)
    .where(
      and(
        eq(classroomGroups.workspaceId, actor.workspaceId),
        eq(classroomGroups.key, groupKey),
      ),
    )
    .limit(1);

  return Boolean(group);
}
