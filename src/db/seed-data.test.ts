import { describe, expect, it } from "vitest";

import {
  SYNTHETIC_SEED_IDS,
  syntheticSeedData,
} from "@/db/seed-data";

describe("synthetic development seed data", () => {
  it("defines one teacher and two assistants", () => {
    expect(syntheticSeedData.users).toHaveLength(3);
    expect(
      syntheticSeedData.classroomMemberships.filter((membership) => membership.role === "TEACHER"),
    ).toHaveLength(1);
    expect(
      syntheticSeedData.classroomMemberships.filter((membership) => membership.role === "ASSISTANT"),
    ).toHaveLength(2);

    expect(syntheticSeedData.classroomMemberships).toHaveLength(3);
  });

  it("provides three fictional students with representative active goals", () => {
    expect(syntheticSeedData.students.map((student) => student.displayName)).toEqual(
      ["River", "Sage", "Micah"],
    );
    expect(syntheticSeedData.goals).toHaveLength(7);

    for (const student of syntheticSeedData.students) {
      const goals = syntheticSeedData.goals.filter(
        (goal) => goal.studentId === student.id,
      );
      expect(goals.length).toBeGreaterThanOrEqual(2);
      expect(goals.every((goal) => goal.status === "ACTIVE")).toBe(true);
    }
  });

  it("keeps every record inside the synthetic workspace", () => {
    const workspaceScopedRecords = [
      ...syntheticSeedData.classroomMemberships,
      ...syntheticSeedData.students,
      ...syntheticSeedData.goals,
      ...syntheticSeedData.strategies,
      ...syntheticSeedData.goalStrategyAssignments,
    ];

    expect(
      workspaceScopedRecords.every(
        (record) => record.workspaceId === SYNTHETIC_SEED_IDS.workspace,
      ),
    ).toBe(true);
  });

  it("assigns one versioned active strategy to its intended goal", () => {
    expect(syntheticSeedData.strategies).toHaveLength(1);
    expect(syntheticSeedData.goalStrategyAssignments).toHaveLength(1);

    const strategy = syntheticSeedData.strategies[0];
    const assignment = syntheticSeedData.goalStrategyAssignments[0];
    expect(assignment).toMatchObject({
      goalId: SYNTHETIC_SEED_IDS.riverDirectionsGoal,
      strategyId: strategy.id,
      strategyVersion: strategy.version,
      status: "ACTIVE",
    });
    expect(strategy.createdByUserId).toBe(SYNTHETIC_SEED_IDS.teacher);
  });

  it("uses reserved invalid-domain accounts for every synthetic user", () => {
    expect(
      syntheticSeedData.users.every((user) =>
        user.email.endsWith(".example.invalid"),
      ),
    ).toBe(true);
  });
});
