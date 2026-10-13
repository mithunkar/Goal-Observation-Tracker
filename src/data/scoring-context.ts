import type { AuthorizationActor } from "@/auth/authorization";
import { canCreateStudentSession } from "@/auth/authorization";
import { buildAuthorizedScoringContextQuery } from "@/db/queries/scoring-context";
import { syntheticSeedData } from "@/db/seed-data";

export type ScoringActor = AuthorizationActor & {
  displayName: string;
};

export type AuthorizedScoringContext = {
  source: "DATABASE" | "SYNTHETIC_FIXTURE";
  student: {
    id: string;
    displayName: string;
  };
  sessionType: string;
  scorerLabel: string;
  goals: Array<{
    id: string;
    version: number;
    title: string;
    domain: string;
    objective: string;
    strategy: null | {
      assignmentId: string;
      id: string;
      version: number;
      name: string;
      reminder: string;
      fidelityPrompt: string;
    };
  }>;
};

export async function loadAuthorizedScoringContext(
  actor: ScoringActor,
  studentId: string,
): Promise<AuthorizedScoringContext | null> {
  if (actor.status !== "ACTIVE") {
    return null;
  }

  if (process.env.DATABASE_URL) {
    const { db } = await import("@/db/client");
    const rows = await buildAuthorizedScoringContextQuery(
      db,
      actor,
      studentId,
    );
    if (rows.length === 0) {
      return null;
    }

    return {
      source: "DATABASE",
      student: {
        id: rows[0].studentId,
        displayName: rows[0].studentDisplayName,
      },
      sessionType: "Morning centers",
      scorerLabel: actor.displayName,
      goals: rows.map((row) => ({
        id: row.goalId,
        version: row.goalVersion,
        title: row.goalTitle,
        domain: row.goalDomain,
        objective: row.goalObjective,
        strategy:
          row.strategyAssignmentId &&
          row.strategyId &&
          row.strategyVersion &&
          row.strategyName &&
          row.strategyInstructions &&
          row.strategyFidelityPrompt
            ? {
                assignmentId: row.strategyAssignmentId,
                id: row.strategyId,
                version: row.strategyVersion,
                name: row.strategyName,
                reminder: row.strategyInstructions,
                fidelityPrompt: row.strategyFidelityPrompt,
              }
            : null,
      })),
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production.");
  }

  const student = syntheticSeedData.students.find(
    (candidate) => candidate.id === studentId,
  );
  if (
    !student ||
    !canCreateStudentSession(
      actor,
      student,
    )
  ) {
    return null;
  }

  const goals = syntheticSeedData.goals
    .filter((goal) => goal.studentId === studentId && goal.status === "ACTIVE")
    .sort((left, right) => left.position - right.position)
    .map((goal) => {
      const assignment = syntheticSeedData.goalStrategyAssignments.find(
        (candidate) =>
          candidate.goalId === goal.id && candidate.status === "ACTIVE",
      );
      const strategy = assignment
        ? syntheticSeedData.strategies.find(
            (candidate) =>
              candidate.id === assignment.strategyId &&
              candidate.version === assignment.strategyVersion,
          )
        : null;

      return {
        id: goal.id,
        version: goal.version,
        title: goal.title,
        domain: goal.domain,
        objective: goal.objectiveText,
        strategy:
          assignment && strategy
            ? {
                assignmentId: assignment.id,
                id: strategy.id,
                version: strategy.version,
                name: strategy.name,
                reminder: strategy.instructions,
                fidelityPrompt: strategy.fidelityPrompt,
              }
            : null,
      };
    });

  return {
    source: "SYNTHETIC_FIXTURE",
    student: { id: student.id, displayName: student.displayName },
    sessionType: "Morning centers",
    scorerLabel: actor.displayName,
    goals,
  };
}
