import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";

import type { AuthorizationActor } from "@/auth/authorization";
import { SYNTHETIC_SEED_IDS } from "@/db/seed-data";
import {
  buildAuthorizedStudentListQuery,
  buildAuthorizedStudentQuery,
  buildArchiveStudentQuery,
  buildCreateStudentQuery,
} from "@/db/queries/students";

const database = drizzle.mock();

const teacher: AuthorizationActor = {
  id: SYNTHETIC_SEED_IDS.teacher,
  workspaceId: SYNTHETIC_SEED_IDS.workspace,
  role: "TEACHER",
  status: "ACTIVE",
};

const assistant: AuthorizationActor = {
  id: SYNTHETIC_SEED_IDS.assignedAssistant,
  workspaceId: SYNTHETIC_SEED_IDS.workspace,
  role: "ASSISTANT",
  status: "ACTIVE",
};

describe("authorized student queries", () => {
  it("scopes a teacher list to the current workspace", () => {
    const query = buildAuthorizedStudentListQuery(database, teacher).toSQL();

    expect(query.sql).toContain('from "students"');
    expect(query.sql).toContain('"students"."workspace_id" = $1');
    expect(query.sql).not.toContain('join "user_student_assignments"');
    expect(query.params).toEqual([SYNTHETIC_SEED_IDS.workspace, "ACTIVE"]);
  });

  it("gives an assistant the same workspace-scoped list", () => {
    const query = buildAuthorizedStudentListQuery(database, assistant).toSQL();

    expect(query.sql).not.toContain('user_student_assignments');
    expect(query.params).toEqual([SYNTHETIC_SEED_IDS.workspace, "ACTIVE"]);
  });

  it("scopes a single student to the teacher's workspace", () => {
    const query = buildAuthorizedStudentQuery(
      database,
      teacher,
      SYNTHETIC_SEED_IDS.river,
    ).toSQL();

    expect(query.sql).toContain('"students"."workspace_id" = $1');
    expect(query.sql).toContain('"students"."id" = $2');
    expect(query.params).toEqual([
      SYNTHETIC_SEED_IDS.workspace,
      SYNTHETIC_SEED_IDS.river,
      "ACTIVE",
      1,
    ]);
  });

  it("creates a student inside the teacher's workspace", () => {
    const query = buildCreateStudentQuery(database, teacher, {
      displayName: "Avery", group: "AM_MW",
    }).toSQL();

    expect(query.sql).toContain('insert into "students"');
    expect(query.sql).toContain('"workspace_id"');
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
    expect(query.params).toContain("Avery");
  });

  it("allows assistants to create students", () => {
    const query = buildCreateStudentQuery(database, assistant, {
      displayName: "Avery", group: "AM_MW",
    }).toSQL();
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
  });

  it("archives an active student inside the teacher's workspace", () => {
    const archivedAt = new Date("2026-10-06T12:00:00.000Z");
    const query = buildArchiveStudentQuery(
      database,
      teacher,
      SYNTHETIC_SEED_IDS.river,
      archivedAt,
    ).toSQL();

    expect(query.sql).toContain('update "students"');
    expect(query.sql).toContain('"status" = $1');
    expect(query.sql).toContain('"workspace_id"');
    expect(query.sql).toContain('"id"');
    expect(query.params).toContain("ARCHIVED");
    expect(query.params).toContain(archivedAt.toISOString());
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.river);
    expect(query.params).toContain("ACTIVE");
  });

  it("allows assistants to archive students", () => {
    const query = buildArchiveStudentQuery(
      database,
      assistant,
      SYNTHETIC_SEED_IDS.river,
    ).toSQL();
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.river);
  });
});
