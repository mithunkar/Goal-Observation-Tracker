import { describe, expect, it } from "vitest";

import { SYNTHETIC_SEED_IDS, syntheticIdentity } from "@/db/seed-data";
import { loadAuthorizedScoringContext } from "@/data/scoring-context";

const identity = syntheticIdentity;

describe("authorized scoring context", () => {
  it("loads River's ordered goals and active strategy for the teacher", async () => {
    const context = await loadAuthorizedScoringContext(
      identity(SYNTHETIC_SEED_IDS.teacher),
      SYNTHETIC_SEED_IDS.river,
    );

    expect(context?.student.displayName).toBe("River");
    expect(context?.goals).toHaveLength(3);
    expect(context?.goals[0].strategy).toMatchObject({
      assignmentId: SYNTHETIC_SEED_IDS.visualCueAssignment,
      id: SYNTHETIC_SEED_IDS.visualCueStrategy,
      version: 1,
    });
  });

  it("loads a classroom student's goals for the assistant", async () => {
    const context = await loadAuthorizedScoringContext(
      identity(SYNTHETIC_SEED_IDS.assignedAssistant),
      SYNTHETIC_SEED_IDS.sage,
    );

    expect(context?.student.displayName).toBe("Sage");
    expect(context?.goals).toHaveLength(2);
  });

  it("allows an assistant to score every classroom student", async () => {
    const context = await loadAuthorizedScoringContext(
      identity(SYNTHETIC_SEED_IDS.assignedAssistant),
      SYNTHETIC_SEED_IDS.micah,
    );

    expect(context?.student.displayName).toBe("Micah");
  });
});
