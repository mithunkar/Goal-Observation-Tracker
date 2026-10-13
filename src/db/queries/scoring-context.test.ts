import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";

import type { AuthorizationActor } from "@/auth/authorization";
import { buildAuthorizedScoringContextQuery } from "@/db/queries/scoring-context";
import { SYNTHETIC_SEED_IDS } from "@/db/seed-data";

const database = drizzle.mock();

const baseActor = {
  workspaceId: SYNTHETIC_SEED_IDS.workspace,
  status: "ACTIVE" as const,
};

describe("authorized scoring context query", () => {
  it("scopes teacher goal and strategy reads to the workspace and student", () => {
    const actor: AuthorizationActor = {
      ...baseActor,
      id: SYNTHETIC_SEED_IDS.teacher,
      role: "TEACHER",
    };
    const query = buildAuthorizedScoringContextQuery(
      database,
      actor,
      SYNTHETIC_SEED_IDS.river,
    ).toSQL();

    expect(query.sql).toContain('from "goals"');
    expect(query.sql).toContain('left join "goal_strategy_assignments"');
    expect(query.sql).toContain('left join "strategies"');
    expect(query.sql).not.toContain('join "user_student_assignments"');
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.river);
  });

  it("uses the same classroom-scoped scoring query for assistants", () => {
    const actor: AuthorizationActor = {
      ...baseActor,
      id: SYNTHETIC_SEED_IDS.assignedAssistant,
      role: "ASSISTANT",
    };
    const query = buildAuthorizedScoringContextQuery(
      database,
      actor,
      SYNTHETIC_SEED_IDS.river,
    ).toSQL();

    expect(query.sql).not.toContain('user_student_assignments');
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
  });
});
