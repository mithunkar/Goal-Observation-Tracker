"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  clearDemoDraft,
  DEMO_STORAGE_UNAVAILABLE,
  getDemoDraftSnapshot,
  subscribeToDemoDraft,
  writeDemoDraftSnapshot,
} from "@/demo/demo-browser-store";
import type { DemoSession } from "@/demo/fixtures";
import {
  createDemoSubmission,
  createEmptyDemoDrafts,
  restoreDemoDrafts,
  serializeDemoDrafts,
  type DemoDrafts,
} from "@/demo/demo-storage";
import {
  FIDELITY_LABELS,
  NO_DATA_REASON_LABELS,
} from "@/demo/scoring-labels";
import {
  isDemoGoalDraftComplete,
  type DemoGoalDraft,
  type DemoScore,
} from "@/demo/scoring-state";
import type {
  NoDataReason,
  RubricScore,
  StrategyFidelityStatus,
} from "@/domain/scoring";
import type { SessionSubmissionInput } from "@/domain/session-submission";
import type { ScoringSubmissionResult } from "@/app/classrooms/[classroomId]/students/[studentId]/sessions/new/actions";
import { ScoringKey } from "@/app/scoring-key";

import { SessionReview } from "./session-review";

type RubricLevel = {
  value: RubricScore;
  label: string;
  description: string;
};

type ScoringSessionProps = {
  session: DemoSession;
  rubric: readonly RubricLevel[];
  noDataReasons: readonly NoDataReason[];
  fidelityStatuses: readonly StrategyFidelityStatus[];
  persistSubmission: (
    input: SessionSubmissionInput,
  ) => Promise<ScoringSubmissionResult>;
  returnHref?: string;
};

type SessionMode = "entry" | "review" | "submitted";

export function ScoringSession({
  session,
  rubric,
  noDataReasons,
  fidelityStatuses,
  persistSubmission,
  returnHref = "/dashboard",
}: ScoringSessionProps) {
  const storedDraftSnapshot = useSyncExternalStore(
    subscribeToDemoDraft,
    getDemoDraftSnapshot,
    () => null,
  );
  const restoredDrafts = restoreDemoDrafts(
    storedDraftSnapshot === DEMO_STORAGE_UNAVAILABLE
      ? null
      : storedDraftSnapshot,
    session.goals.map((goal) => goal.id),
  );
  const [fallbackDrafts, setFallbackDrafts] = useState<DemoDrafts>(() =>
    createEmptyDemoDrafts(session.goals.map((goal) => goal.id)),
  );
  const drafts =
    storedDraftSnapshot === DEMO_STORAGE_UNAVAILABLE
      ? fallbackDrafts
      : restoredDrafts;
  const [mode, setMode] = useState<SessionMode>("entry");
  const [submittedDrafts, setSubmittedDrafts] =
    useState<DemoDrafts | null>(null);
  const [databaseSubmission, setDatabaseSubmission] = useState<
    Extract<ScoringSubmissionResult, { status: "success" }> | undefined
  >();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeDrafts =
    mode === "submitted" && submittedDrafts ? submittedDrafts : drafts;

  const completedCount = session.goals.filter((goal) =>
    isDemoGoalDraftComplete(activeDrafts[goal.id], goal.strategy !== null),
  ).length;
  const progress = session.goals.length
    ? (completedCount / session.goals.length) * 100
    : 0;
  const allGoalsComplete =
    session.goals.length > 0 && completedCount === session.goals.length;

  useEffect(() => {
    const headingId =
      mode === "review"
        ? "session-review-title"
        : mode === "submitted"
          ? "submission-confirmation-title"
          : null;

    if (headingId) {
      document.getElementById(headingId)?.focus();
    }
  }, [mode]);

  const updateDraft = (goalId: string, patch: Partial<DemoGoalDraft>) => {
    const updatedDrafts = {
      ...drafts,
      [goalId]: { ...drafts[goalId], ...patch },
    };
    if (!writeDemoDraftSnapshot(serializeDemoDrafts(updatedDrafts))) {
      setFallbackDrafts(updatedDrafts);
    }
  };

  const selectScore = (goalId: string, score: DemoScore) => {
    const updatedDrafts = {
      ...drafts,
      [goalId]: {
        ...drafts[goalId],
        score,
        noDataReason: score === "ND" ? drafts[goalId].noDataReason : null,
      },
    };
    if (!writeDemoDraftSnapshot(serializeDemoDrafts(updatedDrafts))) {
      setFallbackDrafts(updatedDrafts);
    }
  };

  const openReview = () => {
    if (allGoalsComplete) {
      setMode("review");
    }
  };

  const submitSession = async () => {
    if (!allGoalsComplete) {
      return;
    }

    const submission = createDemoSubmission(
      session,
      drafts,
      globalThis.crypto.randomUUID(),
      new Date().toISOString(),
    );

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const observations: SessionSubmissionInput["observations"] =
        submission.observations.map((observation) => {
          const context = {
            goalId: observation.goalId,
            fidelityStatus: observation.fidelityStatus,
            note: observation.note.trim() || null,
          };

          if (observation.score === null) {
            if (!observation.noDataReason) {
              throw new Error("A no-data observation requires a reason.");
            }

            return {
              ...context,
              score: null,
              noDataReason: observation.noDataReason,
            };
          }

          return {
            ...context,
            score: observation.score,
            noDataReason: null,
          };
        });
      const input: SessionSubmissionInput = {
        occurredAt: submission.submittedAt,
        contextTags: [],
        note: null,
        observations,
      };
      const result = await persistSubmission(input);
      if (result.status === "error") {
        setSubmitError(result.message);
        return;
      }

      setDatabaseSubmission(result);

      setSubmittedDrafts(drafts);
      setMode("submitted");
    } catch {
      setSubmitError(
        "The session could not be saved. Your draft is still available in this browser.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startAnotherSession = () => {
    clearDemoDraft();
    setFallbackDrafts(
      createEmptyDemoDrafts(session.goals.map((goal) => goal.id)),
    );
    setSubmittedDrafts(null);
    setDatabaseSubmission(undefined);
    setSubmitError(null);
    setMode("entry");
  };

  const storageMessage =
    storedDraftSnapshot === DEMO_STORAGE_UNAVAILABLE
      ? "Browser storage is unavailable; this draft will reset on refresh."
      : "Draft saved in this browser on this device.";

  return (
    <>
      <section className="session-heading" aria-labelledby="session-title">
        <div>
          <p className="session-kicker">New observation session</p>
          <h1 id="session-title">{session.student.displayName}</h1>
          <p className="session-meta">
            {session.sessionType}
            <span aria-hidden="true">·</span>
            {session.goals.length} active goals
          </p>
        </div>
        <div className="session-progress">
          <span>Session progress</span>
          <strong aria-live="polite">
            {completedCount} of {session.goals.length}
          </strong>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Completed goal entries"
            aria-valuemin={0}
            aria-valuemax={session.goals.length}
            aria-valuenow={completedCount}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <ScoringKey />

      {mode === "entry" ? (
        <>
          <section className="goal-list" aria-label="Active goals">
            {session.goals.map((goal, index) => {
              const draft = drafts[goal.id];
              const isComplete = isDemoGoalDraftComplete(
                draft,
                goal.strategy !== null,
              );
              const needsDetails = draft.score !== null && !isComplete;
              const selectedRubricLevel =
                typeof draft.score === "number"
                  ? rubric.find((level) => level.value === draft.score)
                  : null;

              return (
                <article
              className="goal-card"
              data-complete={isComplete}
              key={goal.id}
              aria-labelledby={`${goal.id}-title`}
            >
              <div className="goal-card-heading">
                <div>
                  <p className="goal-domain">Goal {index + 1}</p>
                  <h2 id={`${goal.id}-title`}>{goal.domain}</h2>
                </div>
                <span className="goal-status" data-complete={isComplete}>
                  {isComplete
                    ? "Ready"
                    : needsDetails
                      ? "Needs details"
                      : "Not scored"}
                </span>
              </div>

              <p className="goal-objective">{goal.objective}</p>

              <div
                className={
                  goal.strategy
                    ? "strategy-panel"
                    : "strategy-panel strategy-panel-empty"
                }
              >
                <p>{goal.strategy ? "Current strategy" : "Strategy"}</p>
                {goal.strategy ? (
                  <>
                    <strong>{goal.strategy.name}</strong>
                    <span>{goal.strategy.reminder}</span>
                  </>
                ) : (
                  <span>No primary strategy is assigned to this goal.</span>
                )}
              </div>

              <fieldset className="entry-fieldset score-fieldset">
                <legend>How much support was needed?</legend>
                <div className="score-options">
                  {rubric.map((level) => {
                    const selected = draft.score === level.value;

                    return (
                      <button
                        type="button"
                        className="score-button"
                        data-selected={selected}
                        aria-pressed={selected}
                        aria-label={`${level.value} — ${level.label}`}
                        onClick={() => selectScore(goal.id, level.value)}
                        key={level.value}
                      >
                        <span>{level.value}</span>
                        {selected ? (
                          <span className="selected-mark" aria-hidden="true">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="score-button score-option-nd"
                    data-selected={draft.score === "ND"}
                    aria-pressed={draft.score === "ND"}
                    aria-label="ND — No data collected"
                    onClick={() => selectScore(goal.id, "ND")}
                  >
                    <span>ND</span>
                    {draft.score === "ND" ? (
                      <span className="selected-mark" aria-hidden="true">
                        ✓
                      </span>
                    ) : null}
                  </button>
                </div>
                <p className="score-help" aria-live="polite">
                  {selectedRubricLevel ? (
                    <>
                      <strong>{selectedRubricLevel.label}:</strong>{" "}
                      {selectedRubricLevel.description}
                    </>
                  ) : draft.score === "ND" ? (
                    "No data was collected. Choose a reason below."
                  ) : (
                    "Choose one value. A score of 0 is an observed outcome; ND means no data."
                  )}
                </p>
              </fieldset>

              {draft.score === "ND" ? (
                <fieldset className="entry-fieldset detail-fieldset">
                  <legend>Why was no data collected?</legend>
                  <div className="choice-grid">
                    {noDataReasons.map((reason) => (
                      <label className="choice-option" key={reason}>
                        <input
                          type="radio"
                          name={`${goal.id}-no-data-reason`}
                          value={reason}
                          checked={draft.noDataReason === reason}
                          onChange={() =>
                            updateDraft(goal.id, { noDataReason: reason })
                          }
                          required
                        />
                        <span>{NO_DATA_REASON_LABELS[reason]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {goal.strategy ? (
                <fieldset className="entry-fieldset detail-fieldset">
                  <legend>{goal.strategy.fidelityPrompt}</legend>
                  <div className="choice-grid fidelity-grid">
                    {fidelityStatuses.map((status) => (
                      <label className="choice-option" key={status}>
                        <input
                          type="radio"
                          name={`${goal.id}-fidelity-status`}
                          value={status}
                          checked={draft.fidelityStatus === status}
                          onChange={() =>
                            updateDraft(goal.id, { fidelityStatus: status })
                          }
                          required
                        />
                        <span>{FIDELITY_LABELS[status]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              <div className="note-field">
                <label htmlFor={`${goal.id}-note`}>Context note (optional)</label>
                <textarea
                  id={`${goal.id}-note`}
                  value={draft.note}
                  onChange={(event) =>
                    updateDraft(goal.id, { note: event.target.value })
                  }
                  maxLength={1000}
                  rows={2}
                  placeholder="Add something that may help interpret this observation."
                />
              </div>
                </article>
              );
            })}
          </section>

          <section
            className="session-actions"
            aria-labelledby="draft-status-title"
          >
            <div>
              <p id="draft-status-title">Draft</p>
              <span aria-live="polite">{storageMessage}</span>
            </div>
            <div className="session-action-control">
              <span>
                {allGoalsComplete
                  ? "All goals are ready to review."
                  : `${session.goals.length - completedCount} goal ${
                      session.goals.length - completedCount === 1
                        ? "needs"
                        : "need"
                    } a complete entry.`}
              </span>
              <button
                type="button"
                className="primary-button"
                onClick={openReview}
                disabled={!allGoalsComplete}
              >
                Review session
              </button>
            </div>
          </section>
        </>
      ) : mode === "review" ? (
        <SessionReview
          session={session}
          drafts={drafts}
          rubric={rubric}
          onBack={() => setMode("entry")}
          onSubmit={() => void submitSession()}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      ) : (
        <section
          className="submission-confirmation"
          aria-labelledby="submission-confirmation-title"
          role="status"
        >
          <span className="confirmation-mark" aria-hidden="true">
            ✓
          </span>
          <p className="session-kicker">Submission complete</p>
          <h2 id="submission-confirmation-title" tabIndex={-1}>
            Session recorded
          </h2>
          <p>
            {session.goals.length} goal entries were recorded for{" "}
            {session.student.displayName}.
          </p>
          {databaseSubmission?.potentialDuplicates.length ? (
            <p className="duplicate-warning" role="note">
              Possible duplicate: {databaseSubmission.potentialDuplicates.length}{" "}
              matching session
              {databaseSubmission.potentialDuplicates.length === 1 ? "" : "s"}{" "}
              was recorded within ten minutes. This submission was still saved.
            </p>
          ) : null}
          <button
            type="button"
            className="primary-button"
            onClick={startAnotherSession}
          >
            Record another session
          </button>
          {databaseSubmission ? (
            <Link className="submission-history-link" href={returnHref}>
              Return to your students
            </Link>
          ) : null}
        </section>
      )}
    </>
  );
}
