import { DEFAULT_RUBRIC } from "@/domain/scoring";

type ScoringKeyProps = {
  context?: "recording" | "target";
};

export function ScoringKey({ context = "recording" }: ScoringKeyProps) {
  return (
    <aside
      className={`rubric-key${context === "target" ? " rubric-key-compact" : ""}`}
      aria-label={context === "target" ? "Target score key" : "Scoring key"}
    >
      <details>
        <summary>
          {context === "target" ? "Need help choosing a score?" : "Scoring key"}
        </summary>
        {context === "target" ? (
          <p className="rubric-key-intro">
            The target is the minimum score that counts as meeting this goal.
          </p>
        ) : null}
        <dl>
          {DEFAULT_RUBRIC.map((level) => (
            <div key={level.value}>
              <dt>{level.value} — {level.label}</dt>
              <dd>{level.description}</dd>
            </div>
          ))}
          {context === "recording" ? (
            <div>
              <dt>ND — No data</dt>
              <dd>No data was collected for that session. Select a reason before submitting.</dd>
            </div>
          ) : null}
        </dl>
      </details>
    </aside>
  );
}
