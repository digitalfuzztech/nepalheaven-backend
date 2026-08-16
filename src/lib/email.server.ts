import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailTemplates } from "@/db/schema/communications";
import {
  assertNoCustomerVisibleAdminAddress,
  getMailRouteForTemplate,
  getMailRouting,
  getMailSenderName,
  getSmtpCredentials,
} from "@/lib/mail-routing.server";

type Variables = Record<string, string | number | null | undefined>;

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export function escapeEmailHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(
  template: string,
  variables: Variables,
  rawKeys = new Set<string>(),
) {
  return template.replace(
    /{{\s*([a-zA-Z][a-zA-Z0-9]*)\s*}}/g,
    (_match, key: string) => {
      const value = variables[key];
      return rawKeys.has(key) ? String(value ?? "") : escapeEmailHtml(value);
    },
  );
}

function textValue(value: unknown) {
  return Array.from(String(value ?? ""))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return (
        code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
      );
    })
    .join("");
}

function brandedShell(content: string, contactAddress: string) {
  const address = escapeEmailHtml(
    process.env["MAIL_BUSINESS_ADDRESS"] ?? "Kathmandu, Nepal",
  );
  const contact = escapeEmailHtml(contactAddress);
  return `<!doctype html><html><body style="margin:0;background:#f5f0e7;color:#24332b;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f0e7"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="background:#173d32;color:#fff;padding:26px 32px"><strong style="font-size:22px">Nepal Heaven</strong><div style="margin-top:6px;color:#d7b56d">Heaven on Earth Awaits.</div></td></tr><tr><td style="padding:32px;line-height:1.65">${content}</td></tr><tr><td style="padding:22px 32px;background:#173d32;color:#dbe6e1;font-size:12px;line-height:1.6">Nepal Heaven Travels &amp; Tours Pvt. Ltd.<br>${address}${contact ? `<br>${contact}` : ""}</td></tr></table></td></tr></table></body></html>`;
}

function mailConfig() {
  const mode = (process.env["MAIL_MODE"] ?? "log").toLowerCase();
  if (process.env["NODE_ENV"] === "production" && mode !== "smtp")
    throw new Error("Production email requires MAIL_MODE=smtp.");
  if (mode !== "smtp" && mode !== "log")
    throw new Error("MAIL_MODE must be smtp or log.");
  return { mode };
}

function smtpTransport(transport: "info" | "admin") {
  const required = ["MAIL_HOST", "MAIL_PORT"] as const;
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length)
    throw new Error(`Missing mail configuration: ${missing.join(", ")}`);
  const port = Number(process.env["MAIL_PORT"]);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("MAIL_PORT must be a valid TCP port.");
  const credentials = getSmtpCredentials(transport);
  if (!credentials.user || !credentials.password)
    throw new Error(
      transport === "admin"
        ? "Admin SMTP credentials are not configured. Set MAIL_ADMIN_USER and MAIL_ADMIN_PASSWORD; aliases must never fall back to the info transport."
        : "Info SMTP credentials are not configured. Set MAIL_INFO_USER and MAIL_INFO_PASSWORD, or the legacy MAIL_USER and MAIL_PASSWORD.",
    );
  return nodemailer.createTransport({
    host: process.env["MAIL_HOST"],
    port,
    secure: String(process.env["MAIL_SECURE"]).toLowerCase() === "true",
    auth: {
      user: credentials.user,
      pass: credentials.password,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

function sendTimeoutMs() {
  const configured = Number(process.env["MAIL_SEND_TIMEOUT_MS"] ?? 180_000);
  if (
    !Number.isInteger(configured) ||
    configured < 30_000 ||
    configured > 600_000
  )
    throw new Error("MAIL_SEND_TIMEOUT_MS must be between 30000 and 600000.");
  return configured;
}

async function withTransportTimeout<T>(
  transport: ReturnType<typeof smtpTransport>,
  operation: () => Promise<T>,
) {
  const timeoutMs = sendTimeoutMs();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          transport.close();
          reject(new Error(`SMTP operation exceeded ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function verifyMailTransport(
  transport: "info" | "admin" = "info",
) {
  const { mode } = mailConfig();
  if (mode === "log")
    return {
      mode,
      verified: false,
      message: "Log mode: SMTP was not contacted.",
    };
  const smtp = smtpTransport(transport);
  await withTransportTimeout(smtp, () => smtp.verify());
  return {
    mode,
    transport,
    verified: true,
    message: "SMTP connection and authentication verified.",
  };
}

export async function sendTemplatedEmail(input: {
  templateKey: string;
  to: string;
  variables: Variables;
  replyTo?: string;
  attachments?: EmailAttachment[];
}) {
  if (!db) throw new Error("Database is not configured.");
  const [template] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.key, input.templateKey))
    .limit(1);
  if (!template || template.status !== "active")
    throw new Error(`Active email template not found: ${input.templateKey}`);
  const rawHtmlKeys = new Set(["summaryHtml", "adminSummaryHtml"]);
  const variables = Object.fromEntries(
    Object.entries(input.variables).map(([key, value]) => [
      key,
      textValue(value),
    ]),
  );
  const subject = render(template.subjectTemplate, variables)
    .replace(/[\r\n]+/g, " ")
    .slice(0, 998);
  const routeKey = getMailRouteForTemplate(input.templateKey);
  const route = getMailRouting()[routeKey];
  const fromName = getMailSenderName(input.templateKey, route);
  const replyTo = input.replyTo || route.replyTo;
  const html = brandedShell(
    render(template.htmlTemplate, variables, rawHtmlKeys),
    route.replyTo,
  );
  const text = render(template.textTemplate, variables);
  const { mode } = mailConfig();
  assertNoCustomerVisibleAdminAddress({
    templateKey: input.templateKey,
    fromAddress: route.address,
    replyTo,
    subject,
    html,
    text,
  });
  if (mode === "log")
    return {
      subject,
      html,
      text,
      from: `${fromName} <${route.address}>`,
      fromAddress: route.address,
      replyTo,
      route: routeKey,
      provider: "log",
      accepted: false,
      messageId: null,
      attachments:
        input.attachments?.map((attachment) => ({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.content.length,
        })) ?? [],
    };
  const transport = smtpTransport(route.transport);
  const result = await withTransportTimeout(transport, () =>
    transport.sendMail({
      from: { name: fromName, address: route.address },
      to: input.to,
      replyTo,
      subject,
      html,
      text,
      attachments: input.attachments,
    }),
  );
  return {
    subject,
    html,
    text,
    from: `${fromName} <${route.address}>`,
    fromAddress: route.address,
    replyTo,
    route: routeKey,
    provider: "smtp",
    accepted: true,
    messageId: result.messageId,
    attachments:
      input.attachments?.map((attachment) => ({
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.content.length,
      })) ?? [],
  };
}
