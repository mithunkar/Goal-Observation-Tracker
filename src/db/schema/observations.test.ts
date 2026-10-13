import { describe, expect, it } from "vitest";

import { getTableConfig } from "drizzle-orm/pg-core";

import {
  noDataReason,
  observations,
  sessions,
  sessionStatus,
  strategyFidelityStatus,
} from "@/db/schema";
import {
  NO_DATA_REASONS,
  STRATEGY_FIDELITY_STATUSES,
} from "@/domain/scoring";

const foreignKeyShape = (table: Parameters<typeof getTableConfig>[0]) =>
  Object.fromEntries(
    getTableConfig(table).foreignKeys.map((key) => {
      const reference = key.reference();
      return [
        key.getName(),
        {
          columns: reference.columns.map((column) => column.name),
          foreignColumns: reference.foreignColumns.map(
            (column) => column.name,
          ),
        },
      ];
    }),
  );

describe("session and observation database schema", () => {
  it("uses the domain lifecycle, no-data, and fidelity values", () => {
    expect(sessionStatus.enumValues).toEqual(["DRAFT", "SUBMITTED"]);
    expect(noDataReason.enumValues).toEqual(NO_DATA_REASONS);
    expect(strategyFidelityStatus.enumValues).toEqual(
      STRATEGY_FIDELITY_STATUSES,
    );
  });

  it("keeps the session student and recorder in its workspace", () => {
    expect(foreignKeyShape(sessions)).toMatchObject({
      sessions_student_foreign_key: {
        columns: ["workspace_id", "student_id"],
        foreignColumns: ["workspace_id", "id"],
      },
      sessions_recorder_foreign_key: {
        columns: ["workspace_id", "recorded_by_user_id"],
        foreignColumns: ["workspace_id", "user_id"],
      },
    });
  });

  it("requires submission status and timestamp to agree", () => {
    expect(getTableConfig(sessions).checks.map((item) => item.name)).toContain(
      "sessions_submission_state",
    );
  });

  it("keeps each observation with the session student and goal", () => {
    expect(foreignKeyShape(observations)).toMatchObject({
      observations_session_foreign_key: {
        columns: ["workspace_id", "student_id", "session_id"],
        foreignColumns: ["workspace_id", "student_id", "id"],
      },
      observations_goal_foreign_key: {
        columns: ["workspace_id", "student_id", "goal_id"],
        foreignColumns: ["workspace_id", "student_id", "id"],
      },
    });
  });

  it("pins an observation to its goal's exact strategy assignment version", () => {
    expect(foreignKeyShape(observations)).toMatchObject({
      observations_strategy_assignment_foreign_key: {
        columns: [
          "workspace_id",
          "goal_id",
          "strategy_assignment_id",
          "strategy_version",
        ],
        foreignColumns: [
          "workspace_id",
          "goal_id",
          "id",
          "strategy_version",
        ],
      },
    });
  });

  it("accepts only one observation for a goal in a session", () => {
    const uniqueIndex = getTableConfig(observations).indexes.find(
      (item) => item.config.name === "observations_session_goal_unique",
    );

    expect(uniqueIndex?.config.unique).toBe(true);
    expect(uniqueIndex?.config.columns.map((column) =>
      "name" in column ? column.name : undefined,
    )).toEqual(["workspace_id", "session_id", "goal_id"]);
  });

  it("enforces goal versions, ND representation, and fidelity separation", () => {
    const checkNames = getTableConfig(observations).checks.map(
      (item) => item.name,
    );

    expect(checkNames).toEqual(
      expect.arrayContaining([
        "observations_goal_version_positive",
        "observations_score_or_no_data",
        "observations_strategy_fidelity_consistency",
      ]),
    );
  });
});
