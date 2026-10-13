import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PrintButton } from "@/app/print-button";
import { formatRate, ProgressTrendChart, ReportCard, SnapshotMetrics } from "@/app/reporting-components";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { summarizeGoals, type AnalyticsObservation } from "@/data/analytics";
import { reportingPeriodFromSearch } from "@/data/reporting-period";
import { listAnalyticsObservations } from "@/db/queries/analytics";
import { findAuthorizedStudent } from "@/db/queries/students";
import { findWorkspaceTimezone } from "@/db/queries/users";
import { classroomPath } from "@/classroom/routes";

export const dynamic = "force-dynamic";

export default async function StudentReportPage({ params, searchParams }: { params: Promise<{ classroomId: string; studentId: string }>; searchParams: Promise<{ start?: string; end?: string }> }) {
  const [{ classroomId, studentId }, search] = await Promise.all([params, searchParams]);
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) redirect(classroomPath(classroomId));
  const { db } = await import("@/db/client");
  const [timezone, student] = await Promise.all([
    findWorkspaceTimezone(db, identity.workspaceId),
    findAuthorizedStudent(db, identity, studentId),
  ]);
  if (!student) notFound();
  const period = reportingPeriodFromSearch(search, timezone);
  const rows = await listAnalyticsObservations(db, identity, { start: period.startAt, end: period.endAt, studentId }) as AnalyticsObservation[];
  const goals = summarizeGoals(rows);

  return <main className="dashboard-shell report-shell parent-report">
    <header className="dashboard-header no-print"><Link className="back-link" href={`${classroomPath(classroomId, `/students/${studentId}/progress`)}?start=${period.start}&end=${period.end}`}>← Progress</Link><PrintButton /></header>
    <section className="student-plan-heading"><div><p className="session-kicker">Parent progress summary</p><h1>{student.displayName}</h1><p>{period.start} to {period.end}</p></div></section>
    <form className="report-filters no-print" method="get"><label>Start<input type="date" name="start" defaultValue={period.start} /></label><label>End<input type="date" name="end" defaultValue={period.end} /></label><button className="secondary-action" type="submit">Update period</button></form>
    {goals.length ? <div className="parent-goal-list">{goals.map(({ goal, rows: goalRows, summary }) => {
      const strategies = [...new Set(goalRows.flatMap((row) => row.strategyName ? [row.strategyName] : []))];
      const targetText = summary.targetRate ? formatRate(summary.targetRate) : "No target set";
      const strategyText = summary.fullFidelityRate.value === null ? "Not documented for this period" : formatRate(summary.fullFidelityRate);
      return <ReportCard key={`${goal.goalId}:${goal.goalVersion}`} title={goal.domain}>
        <p className="goal-area-label">Goal area</p>
        <p className="parent-goal-objective">{goal.goalObjective}</p>
        <SnapshotMetrics metrics={[["Valid observations", summary.validObservationCount], ["No-data entries", summary.noDataCount], ["Median score", summary.medianScore ?? "—"], ["Meeting target", targetText]]} />
        <ProgressTrendChart rows={goalRows} targetScore={goal.targetScore} chartId={`goal-${goal.goalId}-${goal.goalVersion}`} />
        <div className="strategy-summary"><h3>Strategy summary</h3><p><strong>{strategies.length ? strategies.join(", ") : "No strategy documented"}</strong></p><p>Used as planned: {strategyText}</p></div>
      </ReportCard>;
    })}</div> : <section className="roster-empty"><h2>No reportable data for this period</h2><p>Choose another date range after sessions have been recorded.</p></section>}
  </main>;
}
