import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import {
  AuthorizationError,
  canManageClassroom,
  type AuthorizationActor,
  type StudentAuthorizationScope,
} from "@/auth/authorization";
import { goals, goalStrategyAssignments, strategies } from "@/db/schema";
import type { AssignStrategyInput } from "@/domain/strategy";

const goalForStrategySelection = {
  id: goals.id,
  workspaceId: goals.workspaceId,
  studentId: goals.studentId,
  goalArea: goals.domain,
  status: goals.status,
};

type StrategyGoal = {
  id: string;
  workspaceId: string;
  studentId: string;
  goalArea: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
};

export function buildAuthorizedGoalQuery(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  student: StudentAuthorizationScope,
  goalId: string,
) {
  if (!canManageClassroom(actor) || actor.workspaceId !== student.workspaceId) {
    throw new AuthorizationError();
  }

  return database
    .select(goalForStrategySelection)
    .from(goals)
    .where(
      and(
        eq(goals.workspaceId, actor.workspaceId),
        eq(goals.studentId, student.id),
        eq(goals.id, goalId),
      ),
    )
    .limit(1);
}

export async function findAuthorizedGoal(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  student: StudentAuthorizationScope,
  goalId: string,
) {
  const [goal] = await buildAuthorizedGoalQuery(database, actor, student, goalId);
  return goal ?? null;
}

export async function createAndAssignStrategy(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  student: StudentAuthorizationScope,
  goal: StrategyGoal,
  input: AssignStrategyInput,
  startsOn: string,
  existingStrategyId?: string,
) {
  if (
    !canManageClassroom(actor) ||
    actor.workspaceId !== student.workspaceId ||
    goal.workspaceId !== actor.workspaceId ||
    goal.studentId !== student.id
  ) {
    throw new AuthorizationError();
  }

  return database.transaction(async (transaction) => {
    await transaction
      .update(goalStrategyAssignments)
      .set({
        status: "ENDED",
        endsOn: startsOn,
        plannedReviewOn: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(goalStrategyAssignments.workspaceId, actor.workspaceId),
          eq(goalStrategyAssignments.goalId, goal.id),
          eq(goalStrategyAssignments.status, "ACTIVE"),
        ),
      );

    const [currentStrategy] = existingStrategyId
      ? await transaction
          .select({ version: strategies.version })
          .from(strategies)
          .where(
            and(
              eq(strategies.workspaceId, actor.workspaceId),
              eq(strategies.id, existingStrategyId),
            ),
          )
          .orderBy(desc(strategies.version))
          .limit(1)
      : [];
    const strategyVersion = currentStrategy ? currentStrategy.version + 1 : 1;
    const [strategy] = await transaction
      .insert(strategies)
      .values({
        id: existingStrategyId,
        workspaceId: actor.workspaceId,
        name: input.name,
        purpose: `Support ${goal.goalArea}`,
        instructions: input.instructions,
        fidelityPrompt: input.fidelityPrompt,
        version: strategyVersion,
        status: "ACTIVE",
        createdByUserId: actor.id,
      })
      .returning({ id: strategies.id, version: strategies.version });

    if (!strategy) {
      throw new Error("Strategy creation returned no record.");
    }

    const [assignment] = await transaction
      .insert(goalStrategyAssignments)
      .values({
        workspaceId: actor.workspaceId,
        goalId: goal.id,
        strategyId: strategy.id,
        strategyVersion: strategy.version,
        startsOn,
        reason: `Configured for ${goal.goalArea}`,
        status: "ACTIVE",
      })
      .returning({ id: goalStrategyAssignments.id });

    return assignment ?? null;
  });
}

export async function findActiveStrategyForGoal(
  database: NodePgDatabase,
  actor: AuthorizationActor,
  goalId: string,
) {
  if (!canManageClassroom(actor)) throw new AuthorizationError();
  const [strategy] = await database
    .select({ id: strategies.id, name: strategies.name, instructions: strategies.instructions, fidelityPrompt: strategies.fidelityPrompt })
    .from(goalStrategyAssignments)
    .innerJoin(
      strategies,
      and(
        eq(strategies.workspaceId, goalStrategyAssignments.workspaceId),
        eq(strategies.id, goalStrategyAssignments.strategyId),
        eq(strategies.version, goalStrategyAssignments.strategyVersion),
      ),
    )
    .where(and(eq(goalStrategyAssignments.workspaceId, actor.workspaceId), eq(goalStrategyAssignments.goalId, goalId), eq(goalStrategyAssignments.status, "ACTIVE")))
    .limit(1);
  return strategy ?? null;
}
