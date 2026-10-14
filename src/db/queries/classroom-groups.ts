import { and, asc, eq, exists, max, ne, notExists } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { alias } from "drizzle-orm/pg-core";

import {
  AuthorizationError,
  canManageGroups,
  type AuthorizationActor,
} from "@/auth/authorization";
import { classroomGroups, students } from "@/db/schema";
import type { CreateClassroomGroupInput } from "@/domain/classroom-group";

const classroomGroupSelection = {
  key: classroomGroups.key,
  name: classroomGroups.name,
  position: classroomGroups.position,
};

export class ClassroomGroupDeletionError extends Error {
  constructor(
    readonly code: "GROUP_NOT_FOUND" | "GROUP_NOT_EMPTY" | "LAST_GROUP",
  ) {
    super(code);
    this.name = "ClassroomGroupDeletionError";
  }
}

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

export function buildDeleteClassroomGroupQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  groupKey: string,
) {
  if (!canManageGroups(actor)) throw new AuthorizationError();

  const otherGroups = alias(classroomGroups, "other_groups");

  return database
    .delete(classroomGroups)
    .where(
      and(
        eq(classroomGroups.workspaceId, actor.workspaceId),
        eq(classroomGroups.key, groupKey),
        notExists(
          database
            .select({ id: students.id })
            .from(students)
            .where(
              and(
                eq(students.workspaceId, actor.workspaceId),
                eq(students.group, groupKey),
              ),
            )
            .limit(1),
        ),
        exists(
          database
            .select({ key: otherGroups.key })
            .from(otherGroups)
            .where(
              and(
                eq(otherGroups.workspaceId, actor.workspaceId),
                ne(otherGroups.key, groupKey),
              ),
            )
            .limit(1),
        ),
      ),
    )
    .returning({ key: classroomGroups.key });
}

export async function deleteClassroomGroup(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  groupKey: string,
) {
  if (!canManageGroups(actor)) throw new AuthorizationError();

  return database.transaction(async (transaction) => {
    const [deletedGroup] = await buildDeleteClassroomGroupQuery(
      transaction,
      actor,
      groupKey,
    );
    if (deletedGroup) return deletedGroup;

    const [group] = await transaction
      .select({ key: classroomGroups.key })
      .from(classroomGroups)
      .where(
        and(
          eq(classroomGroups.workspaceId, actor.workspaceId),
          eq(classroomGroups.key, groupKey),
        ),
      )
      .limit(1);
    if (!group) throw new ClassroomGroupDeletionError("GROUP_NOT_FOUND");

    const [student] = await transaction
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.workspaceId, actor.workspaceId),
          eq(students.group, groupKey),
        ),
      )
      .limit(1);
    if (student) throw new ClassroomGroupDeletionError("GROUP_NOT_EMPTY");

    throw new ClassroomGroupDeletionError("LAST_GROUP");
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
