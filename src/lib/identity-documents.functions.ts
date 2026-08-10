import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMyIdentityDocumentsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getMyIdentityDocuments, isIdentityAuthorizationError } =
      await import("@/lib/identity-documents.server");
    try {
      return { ok: true as const, documents: await getMyIdentityDocuments() };
    } catch (error) {
      if (isIdentityAuthorizationError(error))
        return { ok: false as const, code: "UNAUTHORIZED" as const };
      console.error("Identity-document metadata read failed", error);
      return { ok: false as const, code: "INTERNAL_ERROR" as const };
    }
  },
);

export const downloadIdentityDocumentFn = createServerFn({ method: "GET" })
  .validator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { downloadAuthorizedIdentityDocument, isIdentityAuthorizationError } =
      await import("@/lib/identity-documents.server");
    try {
      return {
        ok: true as const,
        document: await downloadAuthorizedIdentityDocument(data.documentId),
      };
    } catch (error) {
      if (isIdentityAuthorizationError(error))
        return { ok: false as const, code: "NOT_FOUND" as const };
      console.error("Identity-document download failed", error);
      return { ok: false as const, code: "INTERNAL_ERROR" as const };
    }
  });
