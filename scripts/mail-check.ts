import { verifyMailTransport } from "../src/lib/email.server.ts";

try {
  const transport = process.argv.includes("--transport=admin")
    ? "admin"
    : "info";
  const result = await verifyMailTransport(transport);
  console.log(result.message);
  if (result.mode === "log")
    console.log(
      "Set MAIL_MODE=smtp with the documented MAIL_* variables to test real SMTP.",
    );
  process.exit(0);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Mail verification failed.",
  );
  process.exit(1);
}
