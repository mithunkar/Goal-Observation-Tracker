"use client";

import { useActionState } from "react";

import {
  initialStudentActionState,
  type StudentActionState,
} from "@/domain/student";
import type { StudentGroup } from "@/domain/catalog";

type StudentFormProps = {
  action: (
    state: StudentActionState,
    formData: FormData,
  ) => Promise<StudentActionState>;
  initialStudent?: {
    displayName: string;
    group: StudentGroup;
    teacherNotes: string | null;
  };
  groups: Array<{ key: string; name: string }>;
  submitLabel?: string;
};

export function StudentForm({ action, groups, initialStudent, submitLabel = "Add student" }: StudentFormProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialStudentActionState,
  );

  return (
    <form className="account-form" action={formAction} noValidate>
      <label className="form-field">
        <span>Student name</span>
        <input
          name="displayName"
          maxLength={80}
          aria-invalid={Boolean(state.errors?.displayName)}
          aria-describedby={
            state.errors?.displayName ? "student-name-error" : undefined
          }
          autoFocus
          defaultValue={initialStudent?.displayName}
          required
        />
        {state.errors?.displayName ? (
          <small id="student-name-error">{state.errors.displayName[0]}</small>
        ) : null}
      </label>

      <label className="form-field">
        <span>Schedule group</span>
        <select name="group" defaultValue={initialStudent?.group ?? ""} required>
          <option value="" disabled>Choose a group</option>
          {groups.map((group) => (
            <option key={group.key} value={group.key}>{group.name}</option>
          ))}
        </select>
      </label>

      <label className="form-field">
        <span>Teacher notes <small>(private)</small></span>
        <textarea name="teacherNotes" rows={4} maxLength={2000} defaultValue={initialStudent?.teacherNotes ?? ""} />
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
