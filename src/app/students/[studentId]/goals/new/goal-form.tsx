"use client";

import { useActionState } from "react";

import {
  initialGoalActionState,
  type GoalActionState,
} from "@/domain/goal";
import { GOAL_AREAS, type GoalArea } from "@/domain/catalog";
import { ScoringKey } from "@/app/scoring-key";

type GoalFormProps = {
  action: (
    state: GoalActionState,
    formData: FormData,
  ) => Promise<GoalActionState>;
  initialGoal?: {
    objectiveText: string;
    domain: GoalArea;
    targetScore: number | null;
    status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
  };
  submitLabel?: string;
};

export function GoalForm({ action, initialGoal, submitLabel = "Save goal" }: GoalFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialGoalActionState,
  );

  return (
    <form className="account-form" action={formAction} noValidate>
      <label className="form-field">
        <span>What should the student do?</span>
        <textarea
          name="objectiveText"
          rows={4}
          maxLength={1000}
          aria-invalid={Boolean(state.errors?.objectiveText)}
          aria-describedby={
            state.errors?.objectiveText ? "goal-objective-error" : undefined
          }
          required
          defaultValue={initialGoal?.objectiveText}
        />
        {state.errors?.objectiveText ? (
          <small id="goal-objective-error">{state.errors.objectiveText[0]}</small>
        ) : null}
      </label>

      <ScoringKey context="target" />

      <div className="form-row">
        <label className="form-field">
          <span>Goal area</span>
          <select
            name="goalArea"
            defaultValue={initialGoal?.domain ?? ""}
            aria-invalid={Boolean(state.errors?.goalArea)}
            aria-describedby={
              state.errors?.goalArea ? "goal-area-error" : undefined
            }
            autoFocus
            required
          >
            <option value="" disabled>
              Choose one
            </option>
            {GOAL_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
          </select>
          {state.errors?.goalArea ? (
            <small id="goal-area-error">{state.errors.goalArea[0]}</small>
          ) : null}
        </label>

        <label className="form-field">
          <span>Target score</span>
          <select name="targetScore" defaultValue={initialGoal?.targetScore?.toString() ?? ""}>
            <option value="">No target</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
            <option value="0">0</option>
          </select>
        </label>
      </div>

      {initialGoal?.status ? (
        <label className="form-field">
          <span>Goal status</span>
          <select name="status" defaultValue={initialGoal.status}>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
      ) : null}

      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="form-submit" type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
