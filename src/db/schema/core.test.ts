import { describe, expect, it } from "vitest";

import { getTableConfig } from "drizzle-orm/pg-core";

import {
  goalStatus,
  goalRevisions,
  goals,
  skillArea,
  studentGroup,
  studentStatus,
  userRole,
  userStatus,
  classroomMemberships,
} from "@/db/schema";

describe("core database schema", () => {
  it("defines the supported lifecycle values", () => {
    expect(userRole.enumValues).toEqual(["TEACHER", "ASSISTANT"]);
    expect(userStatus.enumValues).toEqual(["ACTIVE", "INACTIVE"]);
    expect(studentStatus.enumValues).toEqual(["ACTIVE", "ARCHIVED"]);
    expect(goalStatus.enumValues).toEqual([
      "DRAFT",
      "ACTIVE",
      "PAUSED",
      "ARCHIVED",
    ]);
    expect(studentGroup.enumValues).toEqual(["AM_MW", "AM_TTH", "PM"]);
    expect(skillArea.enumValues).toContain("Receptive Communication");
  });

  it("stores immutable goal revisions by workspace, goal, and version", () => {
    const config = getTableConfig(goalRevisions);
    expect(config.primaryKeys[0]?.columns.map((column) => column.name)).toEqual([
      "workspace_id",
      "goal_id",
      "version",
    ]);
  });

  it("stores one role per user and classroom", () => {
    const membershipConfig = getTableConfig(classroomMemberships);
    expect(
      membershipConfig.primaryKeys[0]?.columns.map((column) => column.name),
    ).toEqual(["workspace_id", "user_id"]);
  });

  it("keeps goals in the same workspace as their student", () => {
    const goalConfig = getTableConfig(goals);
    const studentReference = goalConfig.foreignKeys
      .find((key) => key.getName() === "goals_student_foreign_key")
      ?.reference();

    expect(studentReference?.columns.map((column) => column.name)).toEqual([
      "workspace_id",
      "student_id",
    ]);
    expect(
      studentReference?.foreignColumns.map((column) => column.name),
    ).toEqual(["workspace_id", "id"]);
  });

  it("enforces score, ordering, version, and date checks on goals", () => {
    const checkNames = getTableConfig(goals).checks.map((item) => item.name);

    expect(checkNames).toEqual(
      expect.arrayContaining([
        "goals_target_score_range",
        "goals_version_positive",
        "goals_position_nonnegative",
        "goals_active_date_range",
      ]),
    );
  });
});
