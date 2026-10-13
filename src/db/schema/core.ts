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

const createdAt = timestamp("created_at", { withTimezone: true })
  .defaultNow()
  .notNull();

const updatedAt = timestamp("updated_at", { withTimezone: true })
  .defaultNow()
  .notNull();

export const userRole = pgEnum("user_role", ["TEACHER", "ASSISTANT"]);
export const userStatus = pgEnum("user_status", ["ACTIVE", "INACTIVE"]);
export const invitationStatus = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "REVOKED",
]);
export const studentStatus = pgEnum("student_status", [
  "ACTIVE",
  "ARCHIVED",
]);
export const studentGroup = pgEnum("student_group", ["AM_MW", "AM_TTH", "PM"]);
export const skillArea = pgEnum("skill_area", [
  "Social Communication",
  "Social Emotional",
  "Fine Motor",
  "Gross Motor",
  "Adaptive",
  "Cognitive",
  "Receptive Communication",
]);
export const goalStatus = pgEnum("goal_status", [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  createdAt,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check("users_email_normalized", sql`${table.email} = lower(trim(${table.email}))`),
  ],
);

export const classroomMemberships = pgTable(
  "classroom_memberships",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: userRole("role").notNull(),
    status: userStatus("status").default("ACTIVE").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt,
  },
  (table) => [
    primaryKey({
      name: "classroom_memberships_primary_key",
      columns: [table.workspaceId, table.userId],
    }),
    index("classroom_memberships_user_status_index").on(
      table.userId,
      table.status,
    ),
  ],
);

export const classroomInvitations = pgTable(
  "classroom_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    role: userRole("role").default("TEACHER").notNull(),
    tokenHash: text("token_hash").unique(),
    status: invitationStatus("status").default("PENDING").notNull(),
    invitedByUserId: uuid("invited_by_user_id"),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt,
    updatedAt,
  },
  (table) => [
    foreignKey({
      name: "classroom_invitations_inviter_foreign_key",
      columns: [table.workspaceId, table.invitedByUserId],
      foreignColumns: [
        classroomMemberships.workspaceId,
        classroomMemberships.userId,
      ],
    }).onDelete("restrict"),
    uniqueIndex("classroom_invitations_pending_email_unique")
      .on(table.workspaceId, table.email)
      .where(sql`${table.status} = 'PENDING'`),
    index("classroom_invitations_email_status_index").on(
      table.email,
      table.status,
    ),
    check("classroom_invitations_email_normalized", sql`${table.email} = lower(trim(${table.email}))`),
    check(
      "classroom_invitations_state_consistency",
      sql`(${table.status} = 'PENDING' and ${table.acceptedAt} is null and ${table.acceptedByUserId} is null and ${table.revokedAt} is null) or (${table.status} = 'ACCEPTED' and ${table.acceptedAt} is not null and ${table.acceptedByUserId} is not null and ${table.revokedAt} is null) or (${table.status} = 'REVOKED' and ${table.revokedAt} is not null and ${table.acceptedAt} is null and ${table.acceptedByUserId} is null)`,
    ),
  ],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    externalReference: text("external_reference"),
    teacherNotes: text("teacher_notes"),
    group: studentGroup("group").notNull(),
    status: studentStatus("status").default("ACTIVE").notNull(),
    createdAt,
    updatedAt,
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("students_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    index("students_workspace_status_index").on(
      table.workspaceId,
      table.status,
    ),
    index("students_workspace_group_status_name_index").on(
      table.workspaceId,
      table.group,
      table.status,
      table.displayName,
    ),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").notNull(),
    studentId: uuid("student_id").notNull(),
    title: text("title").notNull(),
    objectiveText: text("objective_text").notNull(),
    domain: skillArea("domain").notNull(),
    targetScore: integer("target_score"),
    expectedFrequency: text("expected_frequency").notNull(),
    status: goalStatus("status").default("DRAFT").notNull(),
    activeFrom: date("active_from", { mode: "string" }).notNull(),
    activeTo: date("active_to", { mode: "string" }),
    position: integer("position").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("goals_workspace_id_id_unique").on(
      table.workspaceId,
      table.id,
    ),
    uniqueIndex("goals_workspace_student_id_id_unique").on(
      table.workspaceId,
      table.studentId,
      table.id,
    ),
    foreignKey({
      name: "goals_student_foreign_key",
      columns: [table.workspaceId, table.studentId],
      foreignColumns: [students.workspaceId, students.id],
    }).onDelete("restrict"),
    index("goals_workspace_student_status_index").on(
      table.workspaceId,
      table.studentId,
      table.status,
    ),
    check(
      "goals_target_score_range",
      sql`${table.targetScore} is null or ${table.targetScore} between 0 and 4`,
    ),
    check("goals_version_positive", sql`${table.version} > 0`),
    check("goals_position_nonnegative", sql`${table.position} >= 0`),
    check(
      "goals_active_date_range",
      sql`${table.activeTo} is null or ${table.activeTo} >= ${table.activeFrom}`,
    ),
  ],
);

/** Immutable wording/configuration used to interpret historical observations. */
export const goalRevisions = pgTable(
  "goal_revisions",
  {
    workspaceId: uuid("workspace_id").notNull(),
    goalId: uuid("goal_id").notNull(),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    objectiveText: text("objective_text").notNull(),
    domain: skillArea("domain").notNull(),
    targetScore: integer("target_score"),
    expectedFrequency: text("expected_frequency").notNull(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt,
  },
  (table) => [
    primaryKey({
      name: "goal_revisions_primary_key",
      columns: [table.workspaceId, table.goalId, table.version],
    }),
    foreignKey({
      name: "goal_revisions_goal_foreign_key",
      columns: [table.workspaceId, table.goalId],
      foreignColumns: [goals.workspaceId, goals.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "goal_revisions_creator_foreign_key",
      columns: [table.workspaceId, table.createdByUserId],
      foreignColumns: [
        classroomMemberships.workspaceId,
        classroomMemberships.userId,
      ],
    }).onDelete("restrict"),
    check("goal_revisions_version_positive", sql`${table.version} > 0`),
    check(
      "goal_revisions_target_score_range",
      sql`${table.targetScore} is null or ${table.targetScore} between 0 and 4`,
    ),
  ],
);
