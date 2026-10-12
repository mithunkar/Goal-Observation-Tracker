import type { ReactNode } from "react";

import type { AnalyticsObservation } from "@/data/analytics";
import type { ObservationSummary } from "@/domain/analytics";
import { RUBRIC_SCORE_VALUES, type RubricScore } from "@/domain/scoring";

export function formatRate(value: { numerator: number; denominator: number; value: number | null }) {
  return value.value === null ? "No valid observations" : `${Math.round(value.value * 100)}% (${value.numerator}/${value.denominator})`;
}

export function ScoreDistribution({ summary }: { summary: ObservationSummary }) {
  return <div className="score-distribution" aria-label="Score distribution">
    {[...RUBRIC_SCORE_VALUES].reverse().map((score) => {
      const rate = summary.scoreDistribution[score];
      return <div className="distribution-row" key={score}><strong>{score}</strong><span className="distribution-track"><span style={{ width: `${(rate.value ?? 0) * 100}%` }} /></span><span>{rate.numerator}/{rate.denominator}</span></div>;
    })}
  </div>;
}

export function SummaryMetrics({ summary, includeTarget = true }: { summary: ObservationSummary; includeTarget?: boolean }) {
  const metrics: Array<[string, string]> = [
    ["Valid observations", String(summary.validObservationCount)],
    ["No data", String(summary.noDataCount)],
    ["Median score", summary.medianScore === null ? "—" : String(summary.medianScore)],
    ["Independent (4)", formatRate(summary.independenceRate)],
  ];
  if (includeTarget && summary.targetRate) metrics.push(["Meeting target", formatRate(summary.targetRate)]);
  metrics.push(["Strategy used as planned", formatRate(summary.fullFidelityRate)]);
  return <dl className="summary-metrics">{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function SnapshotMetrics({ metrics }: { metrics: ReadonlyArray<[string, string | number]> }) {
  return <dl className="snapshot-metrics">{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function AreaDistributionChart({ areas }: { areas: ReadonlyArray<{ label: string; summary: ObservationSummary }> }) {
  if (areas.length === 0) return <p>No observations match this period and filter.</p>;
  return <figure className="stacked-chart">
    <figcaption>Score mix by goal area</figcaption>
    <div className="chart-legend" aria-hidden="true">{[...RUBRIC_SCORE_VALUES].reverse().map((score) => <span key={score} data-score={score}>Score {score}</span>)}</div>
    {areas.map(({ label, summary }) => <div className="stacked-chart-row" key={label}>
      <div><strong>{label}</strong><span>{summary.validObservationCount} valid</span></div>
      <div className="stacked-track" role="img" aria-label={`${label}: ${[...RUBRIC_SCORE_VALUES].reverse().map((score) => `score ${score}, ${summary.scoreDistribution[score].numerator}`).join("; ")}`}>
        {[...RUBRIC_SCORE_VALUES].reverse().map((score) => {
          const rate = summary.scoreDistribution[score];
          return <span key={score} data-score={score} style={{ width: `${(rate.value ?? 0) * 100}%` }}>{rate.numerator > 0 ? rate.numerator : ""}</span>;
        })}
      </div>
    </div>)}
  </figure>;
}

export function CoverageChart({ groups }: { groups: ReadonlyArray<{ label: string; valid: number; noData: number }> }) {
  const maximum = Math.max(1, ...groups.map((group) => group.valid + group.noData));
  return <figure className="coverage-chart">
    <figcaption>Collection coverage by schedule group</figcaption>
    <div className="chart-legend"><span className="coverage-valid">Valid observation</span><span className="coverage-nd">No data</span></div>
    {groups.map((group) => <div className="coverage-row" key={group.label}>
      <strong>{group.label}</strong>
      <div className="coverage-track" role="img" aria-label={`${group.label}: ${group.valid} valid observations and ${group.noData} no-data entries`}>
        <span className="coverage-valid" style={{ width: `${(group.valid / maximum) * 100}%` }}>{group.valid || ""}</span>
        <span className="coverage-nd" style={{ width: `${(group.noData / maximum) * 100}%` }}>{group.noData || ""}</span>
      </div>
      <span>{group.valid + group.noData} total</span>
    </div>)}
  </figure>;
}

export function ProgressTrendChart({ rows, targetScore, chartId }: { rows: readonly AnalyticsObservation[]; targetScore: number | null; chartId: string }) {
  const sorted = [...rows].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  const valid = sorted.filter((row): row is AnalyticsObservation & { score: number } => row.score !== null);
  const plottedValid = sorted.flatMap((row, observationIndex) => row.score === null ? [] : [{ row: row as AnalyticsObservation & { score: number }, observationIndex }]);
  const noData = sorted.flatMap((row, observationIndex) => row.score === null ? [{ row, observationIndex }] : []);
  const width = 760;
  const height = 270;
  const left = 46;
  const right = 18;
  const top = 18;
  const bottom = 54;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xForIndex = (index: number) => sorted.length <= 1 ? left + plotWidth / 2 : left + (index / (sorted.length - 1)) * plotWidth;
  const yForScore = (score: number) => top + ((4 - score) / 4) * plotHeight;
  const points = plottedValid.map(({ row, observationIndex }) => `${xForIndex(observationIndex).toFixed(1)},${yForScore(row.score).toFixed(1)}`).join(" ");
  const titleId = `${chartId}-title`;
  const descriptionId = `${chartId}-description`;
  const firstDate = sorted[0]?.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lastDate = sorted.at(-1)?.occurredAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return <figure className="trend-chart">
    <figcaption>Progress over time</figcaption>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
      <title id={titleId}>Scores over time</title>
      <desc id={descriptionId}>{valid.length} valid observations from {firstDate ?? "the selected period"} to {lastDate ?? "the selected period"}; {sorted.length - valid.length} no-data entries.</desc>
      {[0, 1, 2, 3, 4].map((score) => <g key={score}><line className="chart-gridline" x1={left} x2={width - right} y1={yForScore(score)} y2={yForScore(score)} /><text className="chart-axis-label" x={left - 18} y={yForScore(score) + 4}>{score}</text></g>)}
      {targetScore !== null ? <g><line className="target-line" x1={left} x2={width - right} y1={yForScore(targetScore)} y2={yForScore(targetScore)} /><text className="target-label" x={width - right - 4} y={yForScore(targetScore) - 7}>Target {targetScore}</text></g> : null}
      {plottedValid.length > 1 ? <polyline className="trend-line" points={points} /> : null}
      {plottedValid.map(({ row, observationIndex }) => <g key={`${row.sessionId}-${row.goalId}-${observationIndex}`}><circle className="trend-point" cx={xForIndex(observationIndex)} cy={yForScore(row.score)} r="6" /><text className="trend-point-label" x={xForIndex(observationIndex)} y={yForScore(row.score) - 11}>{row.score}</text></g>)}
      {noData.map(({ row, observationIndex }) => <rect key={`${row.sessionId}-nd-${observationIndex}`} className="nd-point" x={xForIndex(observationIndex) - 5} y={height - bottom + 12} width="10" height="10" transform={`rotate(45 ${xForIndex(observationIndex)} ${height - bottom + 17})`} />)}
      {firstDate ? <text className="chart-axis-label" x={left} y={height - 24}>{firstDate}</text> : null}
      {lastDate && lastDate !== firstDate ? <text className="chart-axis-label" textAnchor="end" x={width - right} y={height - 24}>{lastDate}</text> : null}
      {sorted.length > valid.length ? <text className="nd-label" x={left} y={height - 5}>ND: {sorted.length - valid.length} no-data {sorted.length - valid.length === 1 ? "entry" : "entries"}</text> : null}
    </svg>
    <table className="sr-only"><caption>Observation data shown in the progress chart</caption><thead><tr><th>Date</th><th>Outcome</th></tr></thead><tbody>{sorted.map((row, index) => <tr key={`${row.sessionId}-accessible-${index}`}><td>{row.occurredAt.toLocaleDateString()}</td><td>{row.score === null ? "No data" : row.score}</td></tr>)}</tbody></table>
  </figure>;
}

export function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className="report-card"><h2>{title}</h2>{children}</section>;
}

export function scoreLabel(score: RubricScore | null, noDataReason: string | null) {
  return score === null ? `ND${noDataReason ? ` — ${noDataReason.replaceAll("_", " ")}` : ""}` : String(score);
}
