import { describe, expect, it } from "vitest";

import { SYNTHETIC_SEED_IDS, syntheticIdentity } from "@/db/seed-data";
import { loadAuthorizedStudentRoster } from "@/data/student-roster";

const identity = syntheticIdentity;

describe("development student roster", () => {
  it("shows the teacher all three synthetic students", async () => {
    const roster = await loadAuthorizedStudentRoster(
      identity(SYNTHETIC_SEED_IDS.teacher),
    );

    expect(roster.source).toBe("SYNTHETIC_FIXTURE");
    expect(roster.students.map((student) => student.displayName)).toEqual([
      "River",
      "Sage",
      "Micah",
    ]);
  });

  it("shows an assistant the full classroom roster", async () => {
    const roster = await loadAuthorizedStudentRoster(
      identity(SYNTHETIC_SEED_IDS.assignedAssistant),
    );

    expect(roster.students.map((student) => student.displayName)).toEqual(["River", "Sage", "Micah"]);
  });

  it("does not require per-student assistant assignments", async () => {
    const roster = await loadAuthorizedStudentRoster(
      identity(SYNTHETIC_SEED_IDS.unassignedAssistant),
    );

    expect(roster.students.map((student) => student.displayName)).toEqual(["River", "Sage", "Micah"]);
  });
});
