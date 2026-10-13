import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "@/db/schema";
import { syntheticSeedData } from "@/db/seed-data";

export async function seedSyntheticDevelopmentData(
  database: NodePgDatabase,
) {
  await database.transaction(async (transaction) => {
    const workspace = syntheticSeedData.workspaces[0];
    await transaction
      .insert(schema.workspaces)
      .values(workspace)
      .onConflictDoUpdate({
        target: schema.workspaces.id,
        set: { name: workspace.name, timezone: workspace.timezone },
      });

    for (const user of syntheticSeedData.users) {
      await transaction
        .insert(schema.users)
        .values(user)
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            displayName: user.displayName,
            email: user.email,
            updatedAt: user.updatedAt,
          },
        });
    }

    for (const membership of syntheticSeedData.classroomMemberships) {
      await transaction
        .insert(schema.classroomMemberships)
        .values(membership)
        .onConflictDoUpdate({
          target: [
            schema.classroomMemberships.workspaceId,
            schema.classroomMemberships.userId,
          ],
          set: {
            role: membership.role,
            status: membership.status,
            updatedAt: membership.updatedAt,
          },
        });
    }

    for (const student of syntheticSeedData.students) {
      await transaction
        .insert(schema.students)
        .values(student)
        .onConflictDoUpdate({
          target: schema.students.id,
          set: {
            displayName: student.displayName,
            group: student.group,
            teacherNotes: null,
            status: student.status,
            updatedAt: student.updatedAt,
          },
        });
    }

    for (const goal of syntheticSeedData.goals) {
      await transaction
        .insert(schema.goals)
        .values(goal)
        .onConflictDoUpdate({
          target: schema.goals.id,
          set: {
            title: goal.title,
            objectiveText: goal.objectiveText,
            domain: goal.domain,
            targetScore: goal.targetScore,
            expectedFrequency: goal.expectedFrequency,
            status: goal.status,
            activeFrom: goal.activeFrom,
            position: goal.position,
            version: goal.version,
            updatedAt: goal.updatedAt,
          },
      });
      await transaction
        .insert(schema.goalRevisions)
        .values({
          workspaceId: goal.workspaceId,
          goalId: goal.id,
          version: goal.version,
          title: goal.title,
          objectiveText: goal.objectiveText,
          domain: goal.domain,
          targetScore: goal.targetScore,
          expectedFrequency: goal.expectedFrequency,
          createdByUserId: syntheticSeedData.users[0].id,
          createdAt: goal.createdAt,
        })
        .onConflictDoNothing();
    }

    for (const strategy of syntheticSeedData.strategies) {
      await transaction
        .insert(schema.strategies)
        .values(strategy)
        .onConflictDoUpdate({
          target: [
            schema.strategies.workspaceId,
            schema.strategies.id,
            schema.strategies.version,
          ],
          set: {
            name: strategy.name,
            purpose: strategy.purpose,
            instructions: strategy.instructions,
            fidelityPrompt: strategy.fidelityPrompt,
            status: strategy.status,
            createdByUserId: strategy.createdByUserId,
            updatedAt: strategy.updatedAt,
          },
        });
    }

    for (const assignment of syntheticSeedData.goalStrategyAssignments) {
      await transaction
        .insert(schema.goalStrategyAssignments)
        .values(assignment)
        .onConflictDoUpdate({
          target: schema.goalStrategyAssignments.id,
          set: {
            strategyId: assignment.strategyId,
            strategyVersion: assignment.strategyVersion,
            startsOn: assignment.startsOn,
            reason: assignment.reason,
            plannedReviewOn: assignment.plannedReviewOn,
            status: assignment.status,
            updatedAt: assignment.updatedAt,
          },
        });
    }
  });
}
