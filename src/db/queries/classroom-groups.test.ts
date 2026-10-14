import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";

import { AuthorizationError, type AuthorizationActor } from "@/auth/authorization";
import { SYNTHETIC_SEED_IDS } from "@/db/seed-data";
import {
  buildClassroomGroupListQuery,
  buildCreateClassroomGroupQuery,
} from "@/db/queries/classroom-groups";

const database = drizzle.mock();

const teacher: AuthorizationActor = {
  id: SYNTHETIC_SEED_IDS.teacher,
  workspaceId: SYNTHETIC_SEED_IDS.workspace,
  role: "TEACHER",
  status: "ACTIVE",
};

describe("classroom group queries", () => {
  it("lists groups only from the current classroom", () => {
    const query = buildClassroomGroupListQuery(database, teacher).toSQL();
    expect(query.sql).toContain('from "classroom_groups"');
    expect(query.sql).toContain('"classroom_groups"."workspace_id" = $1');
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
  });

  it("creates a named group inside the teacher's classroom", () => {
    const query = buildCreateClassroomGroupQuery(
      database,
      teacher,
      { name: "Friday group" },
      "80000000-0000-4000-8000-000000000001",
      3,
    ).toSQL();

    expect(query.sql).toContain('insert into "classroom_groups"');
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
    expect(query.params).toContain("Friday group");
    expect(query.params).toContain(3);
  });

  it("does not allow assistants to create groups", () => {
    expect(() =>
      buildCreateClassroomGroupQuery(
        database,
        { ...teacher, role: "ASSISTANT" },
        { name: "Friday group" },
        "80000000-0000-4000-8000-000000000001",
        3,
      ),
    ).toThrow(AuthorizationError);
  });
});
