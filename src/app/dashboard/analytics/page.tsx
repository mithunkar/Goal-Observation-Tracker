import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AreaDistributionChart,
  CoverageChart,
  ReportCard,
  ScoreDistribution,
  SnapshotMetrics,
} from "@/app/reporting-components";
import { canManageClassroom } from "@/auth/authorization";
import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { summarizeAnalytics, uniqueSessionCount, type AnalyticsObservation } from "@/data/analytics";
import { reportingPeriodFromSearch } from "@/data/reporting-period";
import { listAnalyticsObservations } from "@/db/queries/analytics";
import { findWorkspaceTimezone } from "@/db/queries/users";
import { GOAL_AREAS, STUDENT_GROUP_LABELS, STUDENT_GROUPS, type GoalArea, type StudentGroup } from "@/domain/catalog";

export const dynamic = "force-dynamic";

type AnalyticsSearch = { start?: string; end?: string; group?: string; goalArea?: string; domain?: string };

export default async function ClassroomAnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsSearch> }) {
  const identity = await requireCurrentApplicationIdentity();
  if (!canManageClassroom(identity)) redirect("/dashboard");

  const search = await searchParams;
  const group = STUDENT_GROUPS.includes(search.group as StudentGroup) ? search.group as StudentGroup : undefined;
  const requestedArea = search.goalArea ?? search.domain;
  const goalArea = GOAL_AREAS.includes(requestedArea as GoalArea) ? requestedArea as GoalArea : undefined;
  const { db } = await import("@/db/client");
  const period = reportingPeriodFromSearch(search, await findWorkspaceTimezone(db, identity.workspaceId));
  const rows = await listAnalyticsObservations(db, identity, { start: period.startAt, end: period.endAt, group, domain: goalArea }) as AnalyticsObservation[];
  const summary = summarizeAnalytics(rows);
  const areaSummaries = GOAL_AREAS.map((area) => ({ label: area, summary: summarizeAnalytics(rows.filter((row) => row.domain === area)) }))
    .filter(({ summary: areaSummary }) => areaSummary.validObservationCount + areaSummary.noDataCount > 0);
  const groupCoverage = STUDENT_GROUPS.map((item) => {
    const groupRows = rows.filter((row) => row.studentGroup === item);
    return { label: STUDENT_GROUP_LABELS[item], valid: groupRows.filter((row) => row.score !== null).length, noData: groupRows.filter((row) => row.score === null).length };
  });

  return <main className="dashboard-shell report-shell">
    <header className="dashboard-header"><Link className="back-link" href="/dashboard">← Students</Link></header>
    <section className="student-plan-heading"><div><p className="session-kicker">Classroom insights</p><h1>Instructional overview</h1><p>Aggregate patterns for planning instruction. Students are never ranked.</p></div></section>
    <form className="report-filters" method="get">
      <label>Start<input type="date" name="start" defaultValue={period.start} /></label>
      <label>End<input type="date" name="end" defaultValue={period.end} /></label>
      <label>Group<select name="group" defaultValue={group ?? ""}><option value="">All groups</option>{STUDENT_GROUPS.map((item) => <option value={item} key={item}>{STUDENT_GROUP_LABELS[item]}</option>)}</select></label>
      <label>Goal area<select name="goalArea" defaultValue={goalArea ?? ""}><option value="">All goal areas</option>{GOAL_AREAS.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      <button className="secondary-action" type="submit">Apply</button>
    </form>
    {rows.length ? <>
      <section className="report-card report-overview" aria-labelledby="collection-overview"><h2 id="collection-overview">Collection overview</h2><SnapshotMetrics metrics={[["Submitted sessions", uniqueSessionCount(rows)], ["Students represented", new Set(rows.map((row) => row.studentId)).size], ["Valid observations", summary.validObservationCount], ["No-data entries", summary.noDataCount]]} /></section>
      <div className="report-grid report-grid-contained">
        <ReportCard title="Overall score distribution"><p className="report-supporting-text">Each rate uses {summary.validObservationCount} valid observations.</p><ScoreDistribution summary={summary} /></ReportCard>
        <ReportCard title="Schedule group coverage"><CoverageChart groups={groupCoverage} /></ReportCard>
      </div>
      <ReportCard title="Patterns by goal area"><p className="report-supporting-text">Counts are shown inside each score band; empty scores are omitted from the band.</p><AreaDistributionChart areas={areaSummaries} /></ReportCard>
    </> : <section className="roster-empty"><h2>No observations match these filters</h2><p>Choose another period, group, or goal area.</p></section>}
  </main>;
}
