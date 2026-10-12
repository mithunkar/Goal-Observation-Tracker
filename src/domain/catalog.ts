import { z } from "zod";

export const STUDENT_GROUPS = ["AM_MW", "AM_TTH", "PM"] as const;
export type StudentGroup = (typeof STUDENT_GROUPS)[number];

export const STUDENT_GROUP_LABELS: Record<StudentGroup, string> = {
  AM_MW: "AM (M/W)",
  AM_TTH: "AM (T/Th)",
  PM: "PM",
};

export const GOAL_AREAS = [
  "Social Communication",
  "Social Emotional",
  "Fine Motor",
  "Gross Motor",
  "Adaptive",
  "Cognitive",
  "Receptive Communication",
] as const;
export type GoalArea = (typeof GOAL_AREAS)[number];

// Database columns retain their original domain/skill-area names for
// compatibility. New UI and application code should use GoalArea.
export const SKILL_AREAS = GOAL_AREAS;
export type SkillArea = GoalArea;

export const studentGroupSchema = z.enum(STUDENT_GROUPS);
export const goalAreaSchema = z.enum(GOAL_AREAS);
export const skillAreaSchema = goalAreaSchema;
