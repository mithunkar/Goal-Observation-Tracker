import Link from "next/link";
import { notFound } from "next/navigation";

import { ScoringSession } from "@/app/demo/session/scoring-session";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { classroomPath } from "@/classroom/routes";
import { loadAuthorizedScoringContext } from "@/data/scoring-context";
import {
  DEFAULT_RUBRIC,
  NO_DATA_REASONS,
  STRATEGY_FIDELITY_STATUSES,
} from "@/domain/scoring";

import { submitAuthorizedScoringSession } from "./actions";

export const dynamic = "force-dynamic";

export default async function NewStudentSessionPage({
  params,
}: {
  params: Promise<{ classroomId: string; studentId: string }>;
}) {
  const { classroomId, studentId } = await params;
  const identity = await requireCurrentApplicationIdentity(classroomId);
  const context = await loadAuthorizedScoringContext(identity, studentId);
  if (!context || context.source !== "DATABASE") {
    notFound();
  }

  const submitSession = submitAuthorizedScoringSession.bind(null, classroomId, studentId);

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <Link className="demo-brand" href={classroomPath(classroomId)} aria-label="Student roster">
          <span className="brand-mark" aria-hidden="true">
            GOT
          </span>
          <span>Goal Observation Tracker</span>
        </Link>
        <div className="demo-header-actions">
          <Link className="demo-history-link" href={classroomPath(classroomId)}>
            Your students
          </Link>
          <span className="demo-user">{identity.displayName}</span>
        </div>
      </header>

      <ScoringSession
        session={context}
        rubric={DEFAULT_RUBRIC}
        noDataReasons={NO_DATA_REASONS}
        fidelityStatuses={STRATEGY_FIDELITY_STATUSES}
        persistSubmission={submitSession}
        returnHref={classroomPath(classroomId)}
      />

      <footer className="demo-footer">
        <Link href={classroomPath(classroomId)}>Return to your students</Link>
      </footer>
    </main>
  );
}
