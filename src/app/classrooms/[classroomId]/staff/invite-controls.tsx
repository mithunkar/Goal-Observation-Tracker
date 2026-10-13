"use client";

import { useActionState, useState } from "react";

import type { InvitationActionState } from "./actions";

const initialState: InvitationActionState = { error: null, link: null };

function CopyableInvitation({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="invitation-result" role="status">
      <label>
        Invitation link
        <input readOnly value={link} />
      </label>
      <button className="secondary-action" type="button" onClick={copyLink}>
        {copied ? "Copied" : "Copy link"}
      </button>
      <p>This link is shown once and expires in seven days.</p>
    </div>
  );
}

export function InviteMemberForm({
  action,
}: {
  action: (
    state: InvitationActionState,
    formData: FormData,
  ) => Promise<InvitationActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="account-form invite-form">
      <label className="form-field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="form-field">
        <span>Role</span>
        <select name="role" defaultValue="ASSISTANT">
          <option value="ASSISTANT">Assistant</option>
          <option value="TEACHER">Teacher</option>
        </select>
      </label>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      <button className="form-submit" type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create invitation"}
      </button>
      {state.link ? <CopyableInvitation link={state.link} /> : null}
    </form>
  );
}

export function RegenerateInvitationButton({
  action,
}: {
  action: (state: InvitationActionState) => Promise<InvitationActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <div className="invitation-regenerate">
      <form action={formAction}>
        <button className="secondary-action" type="submit" disabled={pending}>
          {pending ? "Regenerating…" : "Regenerate link"}
        </button>
      </form>
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
      {state.link ? <CopyableInvitation link={state.link} /> : null}
    </div>
  );
}
