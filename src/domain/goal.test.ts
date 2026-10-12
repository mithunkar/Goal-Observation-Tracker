import { describe, expect, it } from "vitest";

import { createGoalSchema, dateInTimeZone } from "./goal";

describe("goal creation", () => {
  it("normalizes a goal and numeric target", () => {
    expect(
      createGoalSchema.parse({
        goalArea: "Receptive Communication",
        objectiveText: " Follows a one-step direction. ",
        targetScore: "3",
      }),
    ).toEqual({
      title: "Receptive Communication",
      objectiveText: "Follows a one-step direction.",
      domain: "Receptive Communication",
      targetScore: 3,
    });
  });

  it("keeps a blank target unset", () => {
    const result = createGoalSchema.parse({
      goalArea: "Social Communication",
      objectiveText: "Requests help with a word or gesture.",
      targetScore: "",
    });

    expect(result.targetScore).toBeNull();
  });

  it("uses the classroom time zone for active dates", () => {
    expect(
      dateInTimeZone(new Date("2026-10-07T02:00:00.000Z"), "America/Los_Angeles"),
    ).toBe("2026-10-06");
  });
});
