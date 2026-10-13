import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  classroomMemberships,
  goalRevisions,
  goals,
  students,
} from "./core";
import { goalStrategyAssignments } from "./strategies";

const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();

const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

export const sessionStatus = pgEnum("session_status", [
  "DRAFT",
  "SUBMITTED",
]);

export const noDataReason = pgEnum("no_data_reason", [
  "NO_OPPORTUNITY",
  "STUDENT_ABSENT",
  "GOAL_NOT_OBSERVED",
  "SESSION_INTERRUPTED",
  "OTHER",
]);

export const strategyFidelityStatus = pgEnum("strategy_fidelity_status", [
  "FULL",
  "PARTIAL",
  "NOT_USED",
  "NOT_APPLICABLE",
]);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    studentId: uuid("student_id").notNull(),
    sessionType: text("session_type").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recordedByUserId: uuid("recorded_by_user_id").notNull(),
    contextTags: text("context_tags").array(),
    note: text("note"),
    status: sessionStatus("status").default("DRAFT").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("sessions_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("sessions_workspace_student_id_id_unique").on(
      table.workspaceId,
      table.studentId,
      table.id,
    ),
    foreignKey({
      name: "sessions_student_foreign_key",
      columns: [table.workspaceId, table.studentId],
      foreignColumns: [students.workspaceId, students.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "sessions_recorder_foreign_key",
      columns: [table.workspaceId, table.recordedByUserId],
      foreignColumns: [
        classroomMemberships.workspaceId,
        classroomMemberships.userId,
      ],
    }).onDelete("restrict"),
    index("sessions_student_occurred_at_index").on(
      table.workspaceId,
      table.studentId,
      table.occurredAt,
    ),
    index("sessions_workspace_occurred_at_student_index").on(
      table.workspaceId,
      table.occurredAt,
      table.studentId,
    ),
    index("sessions_duplicate_warning_index").on(
      table.workspaceId,
      table.studentId,
      table.sessionType,
      table.recordedByUserId,
      table.occurredAt,
    ),
    check(
      "sessions_submission_state",
      sql`(${table.status} = 'DRAFT' and ${table.submittedAt} is null) or (${table.status} = 'SUBMITTED' and ${table.submittedAt} is not null)`,
    ),
  ],
);

export const observations = pgTable(
  "observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    studentId: uuid("student_id").notNull(),
    sessionId: uuid("session_id").notNull(),
    goalId: uuid("goal_id").notNull(),
    goalVersion: integer("goal_version").notNull(),
    score: integer("score"),
    noDataReason: noDataReason("no_data_reason"),
    strategyAssignmentId: uuid("strategy_assignment_id"),
    strategyVersion: integer("strategy_version"),
    fidelityStatus: strategyFidelityStatus("fidelity_status"),
    fidelityNote: text("fidelity_note"),
    note: text("note"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("observations_session_goal_unique").on(
      table.workspaceId,
      table.sessionId,
      table.goalId,
    ),
    foreignKey({
      name: "observations_session_foreign_key",
      columns: [table.workspaceId, table.studentId, table.sessionId],
      foreignColumns: [
        sessions.workspaceId,
        sessions.studentId,
        sessions.id,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "observations_goal_foreign_key",
      columns: [table.workspaceId, table.studentId, table.goalId],
      foreignColumns: [goals.workspaceId, goals.studentId, goals.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "observations_goal_revision_foreign_key",
      columns: [table.workspaceId, table.goalId, table.goalVersion],
      foreignColumns: [
        goalRevisions.workspaceId,
        goalRevisions.goalId,
        goalRevisions.version,
      ],
    }).onDelete("restrict"),
    foreignKey({
      name: "observations_strategy_assignment_foreign_key",
      columns: [
        table.workspaceId,
        table.goalId,
        table.strategyAssignmentId,
        table.strategyVersion,
      ],
      foreignColumns: [
        goalStrategyAssignments.workspaceId,
        goalStrategyAssignments.goalId,
        goalStrategyAssignments.id,
        goalStrategyAssignments.strategyVersion,
      ],
    }).onDelete("restrict"),
    index("observations_goal_created_at_index").on(
      table.workspaceId,
      table.goalId,
      table.createdAt,
    ),
    check("observations_goal_version_positive", sql`${table.goalVersion} > 0`),
    check(
      "observations_score_or_no_data",
      sql`(${table.score} between 0 and 4 and ${table.noDataReason} is null) or (${table.score} is null and ${table.noDataReason} is not null)`,
    ),
    check(
      "observations_strategy_fidelity_consistency",
      sql`(${table.strategyAssignmentId} is null and ${table.strategyVersion} is null and ${table.fidelityStatus} is null and ${table.fidelityNote} is null) or (${table.strategyAssignmentId} is not null and ${table.strategyVersion} is not null and ${table.fidelityStatus} is not null)`,
    ),
  ],
);
