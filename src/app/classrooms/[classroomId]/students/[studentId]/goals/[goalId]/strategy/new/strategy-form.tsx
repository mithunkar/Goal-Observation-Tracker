"use client";

import { useActionState } from "react";

import {
  initialStrategyActionState,
  type StrategyActionState,
} from "@/domain/strategy";

type StrategyFormProps = {
  action: (
    state: StrategyActionState,
    formData: FormData,
  ) => Promise<StrategyActionState>;
  initialStrategy?: { name: string; instructions: string; fidelityPrompt: string };
  submitLabel?: string;
};

export function StrategyForm({ action, initialStrategy, submitLabel = "Assign strategy" }: StrategyFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialStrategyActionState,
  );

  return (
    <form className="account-form" action={formAction} noValidate>
      <label className="form-field">
        <span>Strategy name</span>
        <input
          name="name"
          maxLength={100}
          aria-invalid={Boolean(state.errors?.name)}
          aria-describedby={
            state.errors?.name ? "strategy-name-error" : undefined
          }
          autoFocus
          defaultValue={initialStrategy?.name}
          required
        />
        {state.errors?.name ? (
          <small id="strategy-name-error">{state.errors.name[0]}</small>
        ) : null}
      </label>

      <label className="form-field">
        <span>What should staff do?</span>
        <textarea
          name="instructions"
          rows={4}
          maxLength={1000}
          aria-invalid={Boolean(state.errors?.instructions)}
          aria-describedby={
            state.errors?.instructions
              ? "strategy-instructions-error"
              : undefined
          }
          required
          defaultValue={initialStrategy?.instructions}
        />
        {state.errors?.instructions ? (
          <small id="strategy-instructions-error">
            {state.errors.instructions[0]}
          </small>
        ) : null}
      </label>

      <label className="form-field">
        <span>Quick strategy-use check</span>
        <input
          name="fidelityPrompt"
          maxLength={300}
          placeholder="Was the strategy used as planned?"
          defaultValue={initialStrategy?.fidelityPrompt}
          aria-invalid={Boolean(state.errors?.fidelityPrompt)}
          aria-describedby={
            state.errors?.fidelityPrompt ? "strategy-check-error" : undefined
          }
          required
        />
        {state.errors?.fidelityPrompt ? (
          <small id="strategy-check-error">
            {state.errors.fidelityPrompt[0]}
          </small>
        ) : null}
      </label>

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
