import "dotenv/config";

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";

import {
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from "../src/auth/invitation-token";
import {
  classroomInvitations,
  workspaces,
} from "../src/db/schema";
import { createDatabasePoolConfig } from "../src/db/connection";
import { normalizeEmail } from "../src/db/queries/users";

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputSchema = z.object({
  name: z.string().trim().min(1, "--name is required"),
  timezone: z.string().trim().min(1, "--timezone is required"),
  teacherEmail: z.string().trim().email("--teacher-email must be valid"),
});

const input = inputSchema.parse({
  name: argument("name"),
  timezone: argument("timezone"),
  teacherEmail: argument("teacher-email"),
});

try {
  new Intl.DateTimeFormat("en-US", { timeZone: input.timezone }).format();
} catch {
  throw new Error(`Unknown IANA timezone: ${input.timezone}`);
}

const databaseUrl = process.env.DATABASE_MIGRATION_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
if (!databaseUrl || !siteUrl) {
  throw new Error(
    "DATABASE_MIGRATION_URL and NEXT_PUBLIC_SITE_URL are required.",
  );
}

const pool = new Pool(
  createDatabasePoolConfig(databaseUrl, { serverless: true }),
);
const database = drizzle({ client: pool });
const token = createInvitationToken();
const email = normalizeEmail(input.teacherEmail);

try {
  const workspaceId = await database.transaction(async (transaction) => {
    const [workspace] = await transaction
      .insert(workspaces)
      .values({ name: input.name, timezone: input.timezone })
      .returning({ id: workspaces.id });

    await transaction.insert(classroomInvitations).values({
      workspaceId: workspace.id,
      email,
      role: "TEACHER",
      tokenHash: hashInvitationToken(token),
      expiresAt: invitationExpiresAt(),
    });
    return workspace.id;
  });

  const [workspace] = await database
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  console.log(`Created classroom: ${workspace.name} (${workspaceId})`);
  console.log(`Teacher invitation: ${siteUrl.replace(/\/$/, "")}/join/${token}`);
  console.log("This invitation is shown once and expires in seven days.");
} finally {
  await pool.end();
}
