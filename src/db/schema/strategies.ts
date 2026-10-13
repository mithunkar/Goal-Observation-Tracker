import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { classroomMemberships, goals } from "./core";

const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();

const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

export const strategyStatus = pgEnum("strategy_status", [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
]);

export const goalStrategyAssignmentStatus = pgEnum(
  "goal_strategy_assignment_status",
  ["PLANNED", "ACTIVE", "ENDED"],
);

export const strategies = pgTable(
  "strategies",
  {
    id: uuid("id").defaultRandom().notNull(),
    workspaceId: uuid("workspace_id").notNull(),
    name: text("name").notNull(),
    purpose: text("purpose").notNull(),
    instructions: text("instructions").notNull(),
    fidelityPrompt: text("fidelity_prompt").notNull(),
    sourceReference: text("source_reference"),
    version: integer("version").default(1).notNull(),
    status: strategyStatus("status").default("DRAFT").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({
      name: "strategies_primary_key",
      columns: [table.workspaceId, table.id, table.version],
    }),
    foreignKey({
      name: "strategies_creator_foreign_key",
      columns: [table.workspaceId, table.createdByUserId],
      foreignColumns: [
        classroomMemberships.workspaceId,
        classroomMemberships.userId,
      ],
    }).onDelete("restrict"),
    index("strategies_workspace_status_index").on(
      table.workspaceId,
      table.status,
    ),
    check("strategies_version_positive", sql`${table.version} > 0`),
  ],
);

export const goalStrategyAssignments = pgTable(
  "goal_strategy_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    goalId: uuid("goal_id").notNull(),
    strategyId: uuid("strategy_id").notNull(),
    strategyVersion: integer("strategy_version").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }),
    reason: text("reason").notNull(),
    plannedReviewOn: date("planned_review_on", { mode: "string" }),
    implementationNotes: text("implementation_notes"),
    conclusion: text("conclusion"),
    status: goalStrategyAssignmentStatus("status")
      .default("PLANNED")
      .notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("goal_strategy_assignments_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex(
      "goal_strategy_assignments_workspace_goal_id_version_unique",
    ).on(
      table.workspaceId,
      table.goalId,
      table.id,
      table.strategyVersion,
    ),
    uniqueIndex("goal_strategy_assignments_one_active_per_goal_unique")
      .on(table.workspaceId, table.goalId)
      .where(sql`${table.status} = 'ACTIVE'`),
    foreignKey({
      name: "goal_strategy_assignments_goal_foreign_key",
      columns: [table.workspaceId, table.goalId],
      foreignColumns: [goals.workspaceId, goals.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "goal_strategy_assignments_strategy_foreign_key",
      columns: [
        table.workspaceId,
        table.strategyId,
        table.strategyVersion,
      ],
      foreignColumns: [
        strategies.workspaceId,
        strategies.id,
        strategies.version,
      ],
    }).onDelete("restrict"),
    index("goal_strategy_assignments_goal_dates_index").on(
      table.workspaceId,
      table.goalId,
      table.startsOn,
    ),
    check(
      "goal_strategy_assignments_date_range",
      sql`${table.endsOn} is null or ${table.endsOn} >= ${table.startsOn}`,
    ),
    check(
      "goal_strategy_assignments_review_date_range",
      sql`${table.plannedReviewOn} is null or (${table.plannedReviewOn} >= ${table.startsOn} and (${table.endsOn} is null or ${table.plannedReviewOn} <= ${table.endsOn}))`,
    ),
    check(
      "goal_strategy_assignments_ended_date_required",
      sql`${table.status} <> 'ENDED' or ${table.endsOn} is not null`,
    ),
  ],
);
