import type { AuthorizationActor } from "@/auth/authorization";
import { filterAuthorizedStudents } from "@/auth/authorization";
import {
  syntheticSeedData,
} from "@/db/seed-data";
import { listClassroomGroups } from "@/db/queries/classroom-groups";
import { listAuthorizedStudents } from "@/db/queries/students";

export async function loadAuthorizedStudentRoster(
  actor: AuthorizationActor,
) {
  if (process.env.DATABASE_URL) {
    const { db } = await import("@/db/client");
    const [students, groups] = await Promise.all([
      listAuthorizedStudents(db, actor),
      listClassroomGroups(db, actor),
    ]);
    return {
      source: "DATABASE" as const,
      students,
      groups,
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  return {
    source: "SYNTHETIC_FIXTURE" as const,
    groups: syntheticSeedData.classroomGroups.map(({ key, name, position }) => ({
      key,
      name,
      position,
    })),
    students: filterAuthorizedStudents(
      actor,
      syntheticSeedData.students,
    ).map(({ id, workspaceId, displayName, group, status }) => ({
      id,
      workspaceId,
      displayName,
      group,
      status,
    })),
  };
}
