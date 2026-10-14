"use client";

import { useActionState } from "react";

import {
  initialClassroomGroupActionState,
  type ClassroomGroupActionState,
} from "@/domain/classroom-group";

type RemoveGroupControlProps = {
  action: (
    state: ClassroomGroupActionState,
    formData: FormData,
  ) => Promise<ClassroomGroupActionState>;
  groupName: string;
  isOnlyGroup: boolean;
  studentCount: number;
};

export function RemoveGroupControl({
  action,
  groupName,
  isOnlyGroup,
  studentCount,
}: RemoveGroupControlProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialClassroomGroupActionState,
  );

  if (studentCount > 0) {
    return (
      <span
        className="group-folder-locked"
        title="Move all students to another group before removing this group."
      >
        In use
      </span>
    );
  }

  if (isOnlyGroup) {
    return (
      <span
        className="group-folder-locked"
        title="Create another group before removing the final group."
      >
        Keep one group
      </span>
    );
  }

  return (
    <details className="group-folder-remove" open={state.status === "error"}>
      <summary>Remove</summary>
      <div>
        <p>Remove “{groupName}”?</p>
        <form action={formAction}>
          <button type="submit" disabled={pending}>
            {pending ? "Removing…" : "Confirm remove"}
          </button>
        </form>
        {state.message ? <p role="alert">{state.message}</p> : null}
      </div>
    </details>
  );
}
