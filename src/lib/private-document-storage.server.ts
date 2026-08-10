import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IDENTITY_DOCUMENT_BYTES = 10 * 1024 * 1024;

const formats = {
  "application/pdf": { extensions: [".pdf"], storedExtension: ".pdf" },
  "image/jpeg": { extensions: [".jpg", ".jpeg"], storedExtension: ".jpg" },
  "image/png": { extensions: [".png"], storedExtension: ".png" },
  "image/webp": { extensions: [".webp"], storedExtension: ".webp" },
} as const;

function storageRoot() {
  const configured = process.env["PRIVATE_DOCUMENT_ROOT"]?.trim();
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), ".private", "identity-documents");
}

function signatureMatches(mimeType: keyof typeof formats, bytes: Uint8Array) {
  if (mimeType === "application/pdf")
    return Buffer.from(bytes.subarray(0, 5)).toString("ascii") === "%PDF-";
  if (mimeType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png")
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  return (
    Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP"
  );
}

export class PrivateDocumentValidationError extends Error {}

export async function storePrivateIdentityDocument(file: File) {
  const originalFilename = file.name.trim();
  if (
    !originalFilename ||
    originalFilename.length > 255 ||
    originalFilename.includes("/") ||
    originalFilename.includes("\\") ||
    path.basename(originalFilename) !== originalFilename
  )
    throw new PrivateDocumentValidationError("The document filename is invalid.");
  if (file.size < 1)
    throw new PrivateDocumentValidationError("The document file is empty.");
  if (file.size > MAX_IDENTITY_DOCUMENT_BYTES)
    throw new PrivateDocumentValidationError(
      "The identity document must be 10 MB or smaller.",
    );
  if (!Object.hasOwn(formats, file.type))
    throw new PrivateDocumentValidationError(
      "Upload a PDF, JPEG, PNG or WEBP document.",
    );
  const mimeType = file.type as keyof typeof formats;
  const extension = path.extname(originalFilename).toLowerCase();
  if (!(formats[mimeType].extensions as readonly string[]).includes(extension))
    throw new PrivateDocumentValidationError(
      "The document extension does not match its file type.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatureMatches(mimeType, bytes))
    throw new PrivateDocumentValidationError(
      "The document contents do not match its declared file type.",
    );

  const storageKey = `${randomUUID()}${formats[mimeType].storedExtension}`;
  const root = storageRoot();
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, storageKey), bytes, { flag: "wx" });
  return {
    storageKey,
    originalFilename,
    mimeType,
    fileSize: bytes.byteLength,
  };
}

function safeStoragePath(storageKey: string) {
  if (!/^[0-9a-f-]{36}\.(?:pdf|jpg|png|webp)$/i.test(storageKey))
    throw new Error("Invalid private storage key.");
  return path.join(storageRoot(), storageKey);
}

export async function readPrivateIdentityDocument(storageKey: string) {
  return readFile(safeStoragePath(storageKey));
}

export async function deletePrivateIdentityDocument(storageKey: string) {
  try {
    await unlink(safeStoragePath(storageKey));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
