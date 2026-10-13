"use server";

import { requireCurrentApplicationIdentity } from "@/auth/application-session";
import { loadAuthorizedScoringContext } from "@/data/scoring-context";
import { persistAuthorizedSession } from "@/data/session-submission";
import type { SessionSubmissionInput } from "@/domain/session-submission";

export type ScoringSubmissionResult =
  | {
      status: "success";
      sessionId: string;
      potentialDuplicates: Array<{ id: string; occurredAt: string }>;
    }
  | { status: "error"; message: string };

export async function submitAuthorizedScoringSession(
  classroomId: string,
  studentId: string,
  input: SessionSubmissionInput,
): Promise<ScoringSubmissionResult> {
  const identity = await requireCurrentApplicationIdentity(classroomId);

  if (!process.env.DATABASE_URL) {
    return {
      status: "error",
      message: "The database is not configured.",
    };
  }

  const context = await loadAuthorizedScoringContext(identity, studentId);
  if (!context || context.source !== "DATABASE") {
    return {
      status: "error",
      message: "This student is no longer available to this staff role.",
    };
  }

  try {
    const { db } = await import("@/db/client");
    const result = await persistAuthorizedSession(db, identity, context, input);

    return {
      status: "success",
      sessionId: result.sessionId,
      potentialDuplicates: result.potentialDuplicates.map((duplicate) => ({
        id: duplicate.id,
        occurredAt: duplicate.occurredAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Scoring submission failed", error);
    return {
      status: "error",
      message:
        "The session could not be saved. Your draft is still available in this browser.",
    };
  }
}
