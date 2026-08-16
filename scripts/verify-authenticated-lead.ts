import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../src/db/index.ts";
import { leads } from "../src/db/schema/leads.ts";
import { sessions } from "../src/db/schema/sessions.ts";
import { users } from "../src/db/schema/users.ts";
import { createPublicLead } from "../src/lib/lead.server.ts";

if (!db) throw new Error("DATABASE_URL is required.");
const [customer] = await db
  .select({ id: users.id, email: users.email, name: users.name })
  .from(users)
  .where(eq(users.role, "customer"))
  .limit(1);
if (!customer)
  throw new Error(
    "An existing customer account is required for the authenticated association test.",
  );
process.env["MAIL_MODE"] = "log";
process.env["MAIL_FROM_ADDRESS"] =
  process.env["MAIL_FROM_ADDRESS"] || "test@nepalheaven.local";
const token = randomBytes(32).toString("base64url");
const sessionId = randomUUID();
await db.insert(sessions).values({
  id: sessionId,
  userId: customer.id,
  tokenHash: createHash("sha256").update(token).digest("hex"),
  expiresAt: new Date(Date.now() + 60_000),
});
const storage = (
  globalThis as Record<
    symbol,
    { run<T>(store: unknown, callback: () => Promise<T>): Promise<T> }
  >
)[Symbol.for("tanstack-start:event-storage")];
if (!storage)
  throw new Error("TanStack request context storage is unavailable.");
const lead = await storage.run(
  {
    h3Event: {
      req: new Request("http://localhost/test", {
        headers: { cookie: `nepalheaven_session=${token}` },
      }),
    },
  },
  () =>
    createPublicLead({
      type: "contact",
      leadLevel: 2,
      name: customer.name,
      email: customer.email,
      message: "PHASE 3 AUTHENTICATED CUSTOMER TEST",
      source: "contact",
    }),
);
await db.delete(sessions).where(eq(sessions.id, sessionId));
const [row] = await db
  .select({ userId: leads.userId, message: leads.message })
  .from(leads)
  .where(eq(leads.id, lead.id))
  .limit(1);
console.log(
  JSON.stringify(
    {
      associatedServerSide: row?.userId === customer.id,
      exactMessage: row?.message === "PHASE 3 AUTHENTICATED CUSTOMER TEST",
      leadId: lead.id,
    },
    null,
    2,
  ),
);
process.exit(0);
