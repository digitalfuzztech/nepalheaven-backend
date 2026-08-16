import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leadInteractions } from "@/db/schema/communications";
import { sendTemplatedEmail } from "@/lib/email.server";
import { runPostResponseTask } from "@/lib/request-background.server";

type MailVariables = Record<string, string | number | null | undefined>;

function safeFailure(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown mail failure";
  return message
    .replace(/(pass(word)?|credential|auth)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 1000);
}

export async function sendAndRecordAccountEmail(input: {
  userId: string;
  interactionType: string;
  templateKey: string;
  to: string;
  variables: MailVariables;
  replyTo?: string;
  sensitiveBody?: boolean;
  eventId?: string;
}) {
  if (!db) return { status: "failed" as const };
  const id = randomUUID();
  const safeBody = input.sensitiveBody
    ? "Sensitive transactional email body intentionally not persisted."
    : "Account email queued for template rendering.";
  await db.insert(leadInteractions).values({
    id,
    leadId: null,
    channel: "email",
    direction: "outbound",
    interactionType: input.interactionType,
    templateKey: input.templateKey,
    body: safeBody,
    toAddress: input.to,
    deliveryStatus: "pending",
    metadata: JSON.stringify({
      userId: input.userId,
      templateKey: input.templateKey,
      ...(input.eventId ? { eventId: input.eventId } : {}),
    }),
  });
  let finalStatus: "sent" | "pending" | "failed" = "pending";
  const deliveryTask = (async () => {
    try {
      const sent = await sendTemplatedEmail({
        templateKey: input.templateKey,
        to: input.to,
        variables: input.variables,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      finalStatus = sent.accepted ? "sent" : "pending";
      await db
        .update(leadInteractions)
        .set({
          subject: sent.subject,
          body: input.sensitiveBody ? safeBody : sent.text,
          fromAddress: sent.fromAddress,
          provider: sent.provider,
          providerMessageId: sent.messageId,
          deliveryStatus: finalStatus,
          sentAt: sent.accepted ? new Date() : null,
          updatedAt: new Date(),
          metadata: JSON.stringify({
            userId: input.userId,
            templateKey: input.templateKey,
            ...(input.eventId ? { eventId: input.eventId } : {}),
            transportMode: sent.provider,
            acceptedByProvider: sent.accepted,
            mailRoute: sent.route,
            replyTo: sent.replyTo,
            fromNameAndAddress: sent.from,
          }),
        })
        .where(eq(leadInteractions.id, id));
    } catch (error) {
      finalStatus = "failed";
      const failureReason = safeFailure(error);
      await db
        .update(leadInteractions)
        .set({ deliveryStatus: "failed", failureReason, updatedAt: new Date() })
        .where(eq(leadInteractions.id, id));
      console.error("Account email failed after account persistence", {
        userId: input.userId,
        templateKey: input.templateKey,
        error: failureReason,
      });
    }
  })();
  const mode = await runPostResponseTask(
    deliveryTask,
    `Account email ${input.templateKey}`,
  );
  return { status: mode === "deferred" ? ("pending" as const) : finalStatus };
}
