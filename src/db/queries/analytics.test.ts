import { drizzle } from "drizzle-orm/node-postgres";
import { describe, expect, it } from "vitest";

import { buildAnalyticsObservationQuery } from "./analytics";
import { SYNTHETIC_SEED_IDS } from "@/db/seed-data";

describe("analytics observation query", () => {
  it("scopes teacher filter reads to the current workspace", () => {
    const database = drizzle.mock();
    const query = buildAnalyticsObservationQuery(database, {
      id: SYNTHETIC_SEED_IDS.teacher, workspaceId: SYNTHETIC_SEED_IDS.workspace, role: "TEACHER", status: "ACTIVE",
    }, {
      start: new Date("2026-10-01T00:00:00.000Z"), end: new Date("2026-10-31T23:59:59.000Z"), group: "AM_MW", domain: "Social Emotional",
    }).toSQL();
    expect(query.sql).toContain('from "observations"');
    expect(query.sql).toContain('join "goal_revisions"');
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
    expect(query.params).toContain("AM_MW");
  });

  it("allows assistant analytics with the same workspace scope", () => {
    const query = buildAnalyticsObservationQuery(drizzle.mock(), {
      id: SYNTHETIC_SEED_IDS.assignedAssistant, workspaceId: SYNTHETIC_SEED_IDS.workspace, role: "ASSISTANT", status: "ACTIVE",
    }, { start: new Date(), end: new Date() }).toSQL();
    expect(query.params).toContain(SYNTHETIC_SEED_IDS.workspace);
  });
});
