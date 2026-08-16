import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leadInteractions } from "@/db/schema/communications";
import { escapeEmailHtml, sendTemplatedEmail } from "@/lib/email.server";
import { getLeadSourceLabel, getLeadTypeLabel } from "@/lib/lead-taxonomy";
import { runPostResponseTask } from "@/lib/request-background.server";

type MailVariables = Record<string, string | number | null | undefined>;

function safeFailure(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown mail transport failure";
  return message
    .replace(/(pass(word)?|credential|auth)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 1000);
}

export function leadSummaryVariables(input: {
  leadId: string;
  leadLevel: number;
  source: string;
  fullName: string;
  email: string;
  phone?: string | null;
  travellers?: number | null;
  interestedIn?: string | null;
  preferredDate?: string | null;
  message?: string | null;
  destinationName?: string | null;
  experienceName?: string | null;
}) {
  const customerRows: Array<[string, unknown]> = [
    ["Phone", input.phone || "Not provided"],
    ["Travellers", input.travellers ?? "Not provided"],
    ["Interested In", input.interestedIn || "Not specified"],
    ["Preferred Dates", input.preferredDate || "Not specified"],
  ];
  const rows: Array<[string, unknown]> = [
    ["Lead Type", getLeadTypeLabel(input.leadLevel)],
    ["Source", getLeadSourceLabel(input.source)],
    ...(input.destinationName
      ? ([["Destination", input.destinationName]] as Array<[string, unknown]>)
      : []),
    ...(input.experienceName
      ? ([["Experience", input.experienceName]] as Array<[string, unknown]>)
      : []),
    ["Name", input.fullName],
    ["Email", input.email],
    ...customerRows,
    ["Message", input.message || "Not provided"],
    ["Reference / Lead ID", input.leadId],
  ];
  return {
    summaryHtml: `<table role="presentation" width="100%" cellspacing="0" cellpadding="6">${customerRows
      .map(
        ([label, value]) =>
          `<tr><td><strong>${escapeEmailHtml(label)}</strong></td><td>${escapeEmailHtml(value)}</td></tr>`,
      )
      .join("")}</table>`,
    summaryText: customerRows
      .map(([label, value]) => `${label}: ${String(value)}`)
      .join("\n"),
    adminSummaryHtml: `<table role="presentation" width="100%" cellspacing="0" cellpadding="6">${rows.map(([label, value]) => `<tr><td style="vertical-align:top"><strong>${escapeEmailHtml(label)}</strong></td><td>${escapeEmailHtml(value)}</td></tr>`).join("")}</table>`,
    adminSummaryText: rows
      .map(([label, value]) => `${label}: ${String(value)}`)
      .join("\n"),
  };
}

export async function sendAndRecordLeadEmail(input: {
  leadId: string;
  interactionType:
    "auto_acknowledgment" | "admin_notification" | "newsletter_subscription";
  templateKey: string;
  to: string;
  variables: MailVariables;
  replyTo?: string;
}) {
  if (!db) return;
  const interactionId = randomUUID();
  await db.insert(leadInteractions).values({
    id: interactionId,
    leadId: input.leadId,
    channel: "email",
    direction: "outbound",
    interactionType: input.interactionType,
    templateKey: input.templateKey,
    body: "Email queued for template rendering.",
    toAddress: input.to,
    deliveryStatus: "pending",
    metadata: JSON.stringify({ templateKey: input.templateKey }),
  });
  const deliveryTask = (async () => {
    try {
      const sent = await sendTemplatedEmail({
        templateKey: input.templateKey,
        to: input.to,
        variables: input.variables,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      await db
        .update(leadInteractions)
        .set({
          subject: sent.subject,
          body: sent.text,
          fromAddress: sent.fromAddress,
          provider: sent.provider,
          providerMessageId: sent.messageId,
          deliveryStatus: sent.accepted ? "sent" : "pending",
          sentAt: sent.accepted ? new Date() : null,
          updatedAt: new Date(),
          metadata: JSON.stringify({
            templateKey: input.templateKey,
            transportMode: sent.provider,
            acceptedByProvider: sent.accepted,
            mailRoute: sent.route,
            replyTo: sent.replyTo,
            fromNameAndAddress: sent.from,
          }),
        })
        .where(eq(leadInteractions.id, interactionId));
    } catch (error) {
      await db
        .update(leadInteractions)
        .set({
          deliveryStatus: "failed",
          failureReason: safeFailure(error),
          updatedAt: new Date(),
        })
        .where(eq(leadInteractions.id, interactionId));
      console.error("Email attempt failed after lead persistence", {
        leadId: input.leadId,
        templateKey: input.templateKey,
        error: safeFailure(error),
      });
    }
  })();
  await runPostResponseTask(deliveryTask, `Lead email ${input.templateKey}`);
}
