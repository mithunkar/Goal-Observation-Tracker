import { describe, expect, it } from "vitest";

import { summarizeAnalytics, summarizeGoals, uniqueSessionCount } from "./analytics";
import type { AnalyticsObservation } from "./analytics";

const base: AnalyticsObservation = {
  sessionId: "session-1", studentId: "student", studentName: "Avery", studentGroup: "AM_MW", studentGroupName: "AM (M/W)", goalId: "goal", goalVersion: 1,
  goalTitle: "Sharing", goalObjective: "Share a toy.", domain: "Social Emotional", targetScore: 3,
  occurredAt: new Date("2026-10-01T17:00:00.000Z"), sessionType: "Centers", scorerName: "Teacher",
  score: 4, noDataReason: null, fidelityStatus: "FULL", note: null, strategyAssignmentId: null, strategyVersion: null, strategyName: null,
};

describe("reporting analytics", () => {
  it("keeps ND observations out of numeric metrics", () => {
    const summary = summarizeAnalytics([base, { ...base, score: null, noDataReason: "NO_OPPORTUNITY" }]);
    expect(summary.validObservationCount).toBe(1);
    expect(summary.noDataCount).toBe(1);
    expect(summary.independenceRate).toMatchObject({ numerator: 1, denominator: 1 });
  });

  it("uses the historical goal version and target for each summary", () => {
    const groups = summarizeGoals([base, { ...base, goalVersion: 2, goalTitle: "Sharing with peers", targetScore: 4, score: 3 }]);
    expect(groups).toHaveLength(2);
    expect(groups[1].summary.targetRate).toMatchObject({ numerator: 0, denominator: 1 });
  });

  it("counts distinct session identifiers instead of inferring sessions from metadata", () => {
    expect(uniqueSessionCount([
      base,
      { ...base, goalId: "goal-2" },
      { ...base, sessionId: "session-2" },
    ])).toBe(2);
  });
});
