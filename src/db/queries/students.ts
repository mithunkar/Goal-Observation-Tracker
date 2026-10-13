import { and, asc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AuthorizationActor } from "@/auth/authorization";
import {
  AuthorizationError,
  canManageClassroom,
} from "@/auth/authorization";
import { students } from "@/db/schema";
import type { CreateStudentInput, UpdateStudentInput } from "@/domain/student";

const studentSelection = {
  id: students.id,
  workspaceId: students.workspaceId,
  displayName: students.displayName,
  group: students.group,
  teacherNotes: students.teacherNotes,
  status: students.status,
};

export function buildAuthorizedStudentListQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
) {
  return database
    .select(studentSelection)
    .from(students)
    .where(
      and(
        eq(students.workspaceId, actor.workspaceId),
        eq(students.status, "ACTIVE"),
      ),
    )
    .orderBy(asc(students.displayName));
}

export async function listAuthorizedStudents(
  database: NodePgDatabase,
  actor: AuthorizationActor,
) {
  if (actor.status !== "ACTIVE") {
    return [];
  }

  return buildAuthorizedStudentListQuery(database, actor);
}

export function buildAuthorizedStudentQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  studentId: string,
) {
  const baseConditions = [
    eq(students.workspaceId, actor.workspaceId),
    eq(students.id, studentId),
    eq(students.status, "ACTIVE"),
  ];

  return database
    .select(studentSelection)
    .from(students)
    .where(and(...baseConditions))
    .limit(1);
}

export async function findAuthorizedStudent(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  studentId: string,
) {
  if (actor.status !== "ACTIVE") {
    return null;
  }
  const [student] = await buildAuthorizedStudentQuery(database, actor, studentId);
  return student ?? null;
}

export function buildCreateStudentQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  input: CreateStudentInput,
) {
  if (!canManageClassroom(actor)) {
    throw new AuthorizationError();
  }

  return database
    .insert(students)
    .values({
      workspaceId: actor.workspaceId,
      displayName: input.displayName,
      group: input.group,
      teacherNotes: input.teacherNotes || null,
      status: "ACTIVE",
    })
    .returning({ id: students.id });
}

export function buildUpdateStudentQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  studentId: string,
  input: UpdateStudentInput,
) {
  if (!canManageClassroom(actor)) {
    throw new AuthorizationError();
  }

  return database
    .update(students)
    .set({
      displayName: input.displayName,
      group: input.group,
      teacherNotes: input.teacherNotes || null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(students.workspaceId, actor.workspaceId),
        eq(students.id, studentId),
        eq(students.status, "ACTIVE"),
      ),
    )
    .returning({ id: students.id });
}

export async function updateStudent(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  studentId: string,
  input: UpdateStudentInput,
) {
  const [student] = await buildUpdateStudentQuery(
    database,
    actor,
    studentId,
    input,
  );
  return student ?? null;
}

export async function createStudent(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  input: CreateStudentInput,
) {
  const [student] = await buildCreateStudentQuery(database, actor, input);
  return student ?? null;
}

export function buildArchiveStudentQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  studentId: string,
  archivedAt = new Date(),
) {
  if (!canManageClassroom(actor)) {
    throw new AuthorizationError();
  }

  return database
    .update(students)
    .set({
      status: "ARCHIVED",
      archivedAt,
      updatedAt: archivedAt,
    })
    .where(
      and(
        eq(students.workspaceId, actor.workspaceId),
        eq(students.id, studentId),
        eq(students.status, "ACTIVE"),
      ),
    )
    .returning({ id: students.id });
}

export async function archiveStudent(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  studentId: string,
) {
  const [student] = await buildArchiveStudentQuery(database, actor, studentId);
  return student ?? null;
}
