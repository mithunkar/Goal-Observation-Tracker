import type { DemoSession } from "@/demo/fixtures";
import {
  createEmptyDemoGoalDraft,
  isDemoGoalDraftComplete,
  type DemoGoalDraft,
} from "@/demo/scoring-state";
import type {
  NoDataReason,
  RubricScore,
  StrategyFidelityStatus,
} from "@/domain/scoring";

export const DEMO_DRAFT_STORAGE_KEY =
  "goal-observation-tracker:demo-session-draft:v1";
export const DEMO_SUBMISSIONS_STORAGE_KEY =
  "goal-observation-tracker:demo-submissions:v1";

export type DemoDrafts = Record<string, DemoGoalDraft>;

export type DemoSubmissionObservation = {
  goalId: string;
  goalTitle: string;
  strategyName: string | null;
  score: RubricScore | null;
  noDataReason: NoDataReason | null;
  fidelityStatus: StrategyFidelityStatus | null;
  note: string;
};

export type DemoSubmission = {
  id: string;
  submittedAt: string;
  student: DemoSession["student"];
  sessionType: string;
  scorerLabel: string;
  observations: DemoSubmissionObservation[];
};

const rubricScores = new Set<unknown>([0, 1, 2, 3, 4]);
const noDataReasons = new Set<unknown>([
  "NO_OPPORTUNITY",
  "STUDENT_ABSENT",
  "GOAL_NOT_OBSERVED",
  "SESSION_INTERRUPTED",
  "OTHER",
]);
const fidelityStatuses = new Set<unknown>([
  "FULL",
  "PARTIAL",
  "NOT_USED",
  "NOT_APPLICABLE",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isDemoGoalDraft = (value: unknown): value is DemoGoalDraft => {
  if (!isRecord(value)) {
    return false;
  }

  const scoreIsValid =
    value.score === null || value.score === "ND" || rubricScores.has(value.score);
  const reasonIsValid =
    value.noDataReason === null || noDataReasons.has(value.noDataReason);
  const fidelityIsValid =
    value.fidelityStatus === null ||
    fidelityStatuses.has(value.fidelityStatus);
  const noteIsValid =
    typeof value.note === "string" && value.note.length <= 1_000;
  const scoreAndReasonAgree =
    value.score === "ND" || value.noDataReason === null;

  return (
    scoreIsValid &&
    reasonIsValid &&
    fidelityIsValid &&
    noteIsValid &&
    scoreAndReasonAgree
  );
};

const isNonEmptyString = (value: unknown, maxLength: number) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maxLength;

const isDemoSubmissionObservation = (
  value: unknown,
): value is DemoSubmissionObservation => {
  if (!isRecord(value)) {
    return false;
  }

  const scoreIsValid = value.score === null || rubricScores.has(value.score);
  const reasonIsValid = noDataReasons.has(value.noDataReason);
  const scoreAndReasonAgree =
    value.score === null ? reasonIsValid : value.noDataReason === null;
  const strategyIsValid =
    value.strategyName === null || isNonEmptyString(value.strategyName, 200);
  const fidelityAndStrategyAgree =
    value.strategyName === null
      ? value.fidelityStatus === null
      : fidelityStatuses.has(value.fidelityStatus);

  return (
    isNonEmptyString(value.goalId, 200) &&
    isNonEmptyString(value.goalTitle, 300) &&
    strategyIsValid &&
    scoreIsValid &&
    scoreAndReasonAgree &&
    fidelityAndStrategyAgree &&
    typeof value.note === "string" &&
    value.note.length <= 1_000
  );
};

const isDemoSubmission = (value: unknown): value is DemoSubmission => {
  if (!isRecord(value) || !isRecord(value.student)) {
    return false;
  }

  if (
    !Array.isArray(value.observations) ||
    value.observations.length === 0 ||
    value.observations.length > 100 ||
    !value.observations.every(isDemoSubmissionObservation)
  ) {
    return false;
  }

  const goalIds = value.observations.map((observation) => observation.goalId);

  return (
    isNonEmptyString(value.id, 200) &&
    isNonEmptyString(value.submittedAt, 100) &&
    Number.isFinite(Date.parse(value.submittedAt as string)) &&
    isNonEmptyString(value.student.id, 200) &&
    isNonEmptyString(value.student.displayName, 200) &&
    isNonEmptyString(value.sessionType, 200) &&
    isNonEmptyString(value.scorerLabel, 200) &&
    new Set(goalIds).size === goalIds.length
  );
};

export const createEmptyDemoDrafts = (
  goalIds: readonly string[],
): DemoDrafts =>
  Object.fromEntries(
    goalIds.map((goalId) => [goalId, createEmptyDemoGoalDraft()]),
  );

export function serializeDemoDrafts(drafts: DemoDrafts) {
  return JSON.stringify({ version: 1, drafts });
}

export function restoreDemoDrafts(
  serialized: string | null,
  goalIds: readonly string[],
) {
  const emptyDrafts = createEmptyDemoDrafts(goalIds);

  if (serialized === null) {
    return emptyDrafts;
  }

  try {
    const stored: unknown = JSON.parse(serialized);
    if (
      !isRecord(stored) ||
      stored.version !== 1 ||
      !isRecord(stored.drafts)
    ) {
      return emptyDrafts;
    }

    const storedDrafts = stored.drafts;
    return Object.fromEntries(
      goalIds.map((goalId) => {
        const draft = storedDrafts[goalId];
        return [
          goalId,
          isDemoGoalDraft(draft) ? draft : createEmptyDemoGoalDraft(),
        ];
      }),
    );
  } catch {
    return emptyDrafts;
  }
}

export function createDemoSubmission(
  session: DemoSession,
  drafts: DemoDrafts,
  id: string,
  submittedAt: string,
): DemoSubmission {
  const hasIncompleteGoal = session.goals.some((goal) =>
    !isDemoGoalDraftComplete(drafts[goal.id], goal.strategy !== null),
  );

  if (hasIncompleteGoal) {
    throw new Error("Cannot submit an incomplete synthetic session.");
  }

  return {
    id,
    submittedAt,
    student: session.student,
    sessionType: session.sessionType,
    scorerLabel: session.scorerLabel,
    observations: session.goals.map((goal) => {
      const draft = drafts[goal.id];
      return {
        goalId: goal.id,
        goalTitle: goal.title,
        strategyName: goal.strategy?.name ?? null,
        score: draft.score === "ND" ? null : draft.score,
        noDataReason: draft.score === "ND" ? draft.noDataReason : null,
        fidelityStatus: goal.strategy ? draft.fidelityStatus : null,
        note: draft.note,
      };
    }),
  };
}

export function appendDemoSubmission(
  serialized: string | null,
  submission: DemoSubmission,
) {
  const existing = restoreDemoSubmissions(serialized);

  return JSON.stringify({
    version: 1,
    submissions: [submission, ...existing].slice(0, 100),
  });
}

export function restoreDemoSubmissions(serialized: string | null) {
  if (serialized === null) {
    return [];
  }

  try {
    const stored: unknown = JSON.parse(serialized);
    if (
      !isRecord(stored) ||
      stored.version !== 1 ||
      !Array.isArray(stored.submissions)
    ) {
      return [];
    }

    const seenIds = new Set<string>();
    return stored.submissions
      .filter(isDemoSubmission)
      .filter((submission) => {
        if (seenIds.has(submission.id)) {
          return false;
        }

        seenIds.add(submission.id);
        return true;
      })
      .slice(0, 100);
  } catch {
    return [];
  }
}
