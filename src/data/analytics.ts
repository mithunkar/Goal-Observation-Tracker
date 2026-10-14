import { summarizeObservations } from "@/domain/analytics";
import type { NoDataReason, ObservationEntry, RubricScore, StrategyFidelityStatus } from "@/domain/scoring";
import type { SkillArea } from "@/domain/catalog";

export type AnalyticsObservation = {
  sessionId: string; studentId: string; studentName: string; studentGroup: string; studentGroupName: string; goalId: string; goalVersion: number;
  goalTitle: string; goalObjective: string; domain: SkillArea; targetScore: number | null;
  occurredAt: Date; sessionType: string; scorerName: string; score: number | null; noDataReason: string | null;
  fidelityStatus: string | null; note: string | null; strategyAssignmentId: string | null; strategyVersion: number | null; strategyName: string | null;
};

function asEntry(row: AnalyticsObservation): ObservationEntry {
  if (row.score === null) {
    return {
      score: null,
      noDataReason: row.noDataReason as NoDataReason,
      fidelityStatus: row.fidelityStatus as StrategyFidelityStatus | null,
      note: row.note,
    };
  }
  return {
    score: row.score as RubricScore,
    noDataReason: null,
    fidelityStatus: row.fidelityStatus as StrategyFidelityStatus | null,
    note: row.note,
  };
}

export function summarizeAnalytics(rows: readonly AnalyticsObservation[]) {
  return summarizeObservations(rows.map(asEntry));
}

export function summarizeGoals(rows: readonly AnalyticsObservation[]) {
  const byGoal = new Map<string, AnalyticsObservation[]>();
  for (const row of rows) byGoal.set(`${row.goalId}:${row.goalVersion}`, [...(byGoal.get(`${row.goalId}:${row.goalVersion}`) ?? []), row]);
  return [...byGoal.values()].map((goalRows) => ({
    goal: goalRows[0],
    rows: goalRows,
    summary: summarizeObservations(goalRows.map(asEntry), goalRows[0].targetScore as RubricScore | null),
  }));
}

export function uniqueSessionCount(rows: readonly AnalyticsObservation[]) {
  return new Set(rows.map((row) => row.sessionId)).size;
}
