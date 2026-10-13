import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReportCard, ScoreDistribution, SummaryMetrics, scoreLabel } from "@/app/reporting-components";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { canManageClassroom } from "@/auth/authorization";
import { listAnalyticsObservations } from "@/db/queries/analytics";
import { findAuthorizedStudent } from "@/db/queries/students";
import { findWorkspaceTimezone } from "@/db/queries/users";
import { summarizeGoals, type AnalyticsObservation } from "@/data/analytics";
import { reportingPeriodFromSearch } from "@/data/reporting-period";
import { classroomPath } from "@/classroom/routes";

export const dynamic = "force-dynamic";

export default async function StudentProgressPage({ params, searchParams }: { params: Promise<{ classroomId: string; studentId: string }>; searchParams: Promise<{ start?: string; end?: string }> }) {
  const [{ classroomId, studentId }, search] = await Promise.all([params, searchParams]);
  const identity = await requireCurrentApplicationIdentity(classroomId);
  if (!canManageClassroom(identity)) redirect(classroomPath(classroomId));
  const { db } = await import("@/db/client");
  const period = reportingPeriodFromSearch(search, await findWorkspaceTimezone(db, identity.workspaceId));
  const student = await findAuthorizedStudent(db, identity, studentId);
  if (!student) notFound();
  const rows = await listAnalyticsObservations(db, identity, { start: period.startAt, end: period.endAt, studentId }) as AnalyticsObservation[];
  const goals = summarizeGoals(rows);
  return <main className="dashboard-shell report-shell"><header className="dashboard-header"><Link className="back-link" href={classroomPath(classroomId, `/students/${studentId}`)}>← {student.displayName}</Link><Link className="secondary-action" href={`${classroomPath(classroomId, `/students/${studentId}/reports`)}?start=${period.start}&end=${period.end}`}>Parent summary</Link></header><section className="student-plan-heading"><div><p className="session-kicker">Student progress</p><h1>{student.displayName}</h1></div></section><form className="report-filters" method="get"><label>Start<input type="date" name="start" defaultValue={period.start} /></label><label>End<input type="date" name="end" defaultValue={period.end} /></label><button className="secondary-action" type="submit">Apply</button></form>{goals.length ? <div className="goal-report-list">{goals.map(({ goal, rows: goalRows, summary }) => <ReportCard key={`${goal.goalId}:${goal.goalVersion}`} title={goal.domain}><p className="goal-area-label">Goal area</p><p>{goal.goalObjective}</p><div className="report-grid"><SummaryMetrics summary={summary} /><ScoreDistribution summary={summary} /></div><h3>Observation timeline</h3><ol className="observation-timeline">{goalRows.map((row, index) => <li key={`${row.goalId}-${index}`}><time dateTime={row.occurredAt.toISOString()}>{row.occurredAt.toLocaleDateString()}</time><strong>{scoreLabel(row.score as 0 | 1 | 2 | 3 | 4 | null, row.noDataReason)}</strong><span>{row.strategyName ? `${row.strategyName} (v${row.strategyVersion})` : "No strategy"}</span><span>{row.fidelityStatus?.replaceAll("_", " ") ?? "—"}</span></li>)}</ol><details><summary>Full observation history</summary><div className="table-scroll"><table><thead><tr><th>Date</th><th>Session</th><th>Score</th><th>Strategy</th><th>Fidelity</th><th>Scorer</th><th>Note</th></tr></thead><tbody>{goalRows.map((row, index) => <tr key={`${row.goalId}-detail-${index}`}><td>{row.occurredAt.toLocaleDateString()}</td><td>{row.sessionType}</td><td>{scoreLabel(row.score as 0 | 1 | 2 | 3 | 4 | null, row.noDataReason)}</td><td>{row.strategyName ? `${row.strategyName} (v${row.strategyVersion})` : "—"}</td><td>{row.fidelityStatus?.replaceAll("_", " ") ?? "—"}</td><td>{row.scorerName}</td><td>{row.note ?? "—"}</td></tr>)}</tbody></table></div></details></ReportCard>)}</div> : <section className="roster-empty"><h2>No observation data yet</h2><p>Record sessions to see progress for this period.</p></section>}</main>;
}
