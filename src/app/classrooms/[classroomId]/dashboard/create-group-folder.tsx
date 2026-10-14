"use client";

import { useActionState } from "react";

import {
  initialClassroomGroupActionState,
  type ClassroomGroupActionState,
} from "@/domain/classroom-group";

type CreateGroupFolderProps = {
  action: (
    state: ClassroomGroupActionState,
    formData: FormData,
  ) => Promise<ClassroomGroupActionState>;
};

export function CreateGroupFolder({ action }: CreateGroupFolderProps) {
  const [state, formAction, pending] = useActionState(
    action,
    initialClassroomGroupActionState,
  );

  return (
    <details className="group-folder group-folder-create" open={state.status === "error"}>
      <summary>
        <span aria-hidden="true">+</span>
        <strong>New group</strong>
        <small>Create a folder</small>
      </summary>
      <form action={formAction}>
        <label htmlFor="new-group-name">Group name</label>
        <input
          id="new-group-name"
          name="name"
          maxLength={40}
          placeholder="e.g. Friday group"
          required
        />
        {state.message ? <p role="alert">{state.message}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create group"}
        </button>
      </form>
    </details>
  );
}
