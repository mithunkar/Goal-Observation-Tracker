import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { AuthorizationError, canManageClassroom, type AuthorizationActor } from "@/auth/authorization";
import { goalRevisions, goalStrategyAssignments, observations, sessions, strategies, students, users } from "@/db/schema";
import type { SkillArea, StudentGroup } from "@/domain/catalog";

export type AnalyticsFilters = {
  start: Date;
  end: Date;
  group?: StudentGroup;
  domain?: SkillArea;
  studentId?: string;
};

export const observationAnalyticsSelection = {
  sessionId: sessions.id,
  studentId: students.id,
  studentName: students.displayName,
  studentGroup: students.group,
  goalId: observations.goalId,
  goalVersion: observations.goalVersion,
  goalTitle: goalRevisions.title,
  goalObjective: goalRevisions.objectiveText,
  domain: goalRevisions.domain,
  targetScore: goalRevisions.targetScore,
  occurredAt: sessions.occurredAt,
  sessionType: sessions.sessionType,
  scorerName: users.displayName,
  score: observations.score,
  noDataReason: observations.noDataReason,
  fidelityStatus: observations.fidelityStatus,
  note: observations.note,
  strategyAssignmentId: observations.strategyAssignmentId,
  strategyVersion: observations.strategyVersion,
  strategyName: strategies.name,
};

export function buildAnalyticsObservationQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  filters: AnalyticsFilters,
) {
  if (!canManageClassroom(actor)) throw new AuthorizationError();
  const conditions = [
    eq(observations.workspaceId, actor.workspaceId),
    eq(sessions.workspaceId, actor.workspaceId),
    eq(sessions.status, "SUBMITTED"),
    gte(sessions.occurredAt, filters.start),
    lte(sessions.occurredAt, filters.end),
  ];
  if (filters.group) conditions.push(eq(students.group, filters.group));
  if (filters.domain) conditions.push(eq(goalRevisions.domain, filters.domain));
  if (filters.studentId) conditions.push(eq(students.id, filters.studentId));

  return database
    .select(observationAnalyticsSelection)
    .from(observations)
    .innerJoin(sessions, and(eq(sessions.workspaceId, observations.workspaceId), eq(sessions.id, observations.sessionId)))
    .innerJoin(students, and(eq(students.workspaceId, observations.workspaceId), eq(students.id, observations.studentId)))
    .innerJoin(goalRevisions, and(eq(goalRevisions.workspaceId, observations.workspaceId), eq(goalRevisions.goalId, observations.goalId), eq(goalRevisions.version, observations.goalVersion)))
    .innerJoin(users, and(eq(users.workspaceId, sessions.workspaceId), eq(users.id, sessions.recordedByUserId)))
    .leftJoin(goalStrategyAssignments, and(eq(goalStrategyAssignments.workspaceId, observations.workspaceId), eq(goalStrategyAssignments.id, observations.strategyAssignmentId)))
    .leftJoin(strategies, and(eq(strategies.workspaceId, goalStrategyAssignments.workspaceId), eq(strategies.id, goalStrategyAssignments.strategyId), eq(strategies.version, observations.strategyVersion)))
    .where(and(...conditions))
    .orderBy(asc(sessions.occurredAt), asc(observations.createdAt));
}

export async function listAnalyticsObservations(database: NodePgDatabase, actor: AuthorizationActor, filters: AnalyticsFilters) {
  return buildAnalyticsObservationQuery(database, actor, filters);
}
