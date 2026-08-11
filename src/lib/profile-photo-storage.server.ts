import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;

const formats = {
  "image/jpeg": { extensions: [".jpg", ".jpeg"], storedExtension: ".jpg" },
  "image/png": { extensions: [".png"], storedExtension: ".png" },
  "image/webp": { extensions: [".webp"], storedExtension: ".webp" },
} as const;

function root() {
  const configured = process.env["PRIVATE_PROFILE_PHOTO_ROOT"]?.trim();
  return configured
    ? path.resolve(configured)
    : path.resolve(process.cwd(), ".private", "profile-photos");
}

function matches(mime: keyof typeof formats, bytes: Uint8Array) {
  if (mime === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png")
    return Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  return (
    Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP"
  );
}

export class ProfilePhotoValidationError extends Error {}

export async function storeProfilePhoto(file: File) {
  const filename = file.name.trim();
  if (
    !filename ||
    filename.length > 255 ||
    filename.includes("/") ||
    filename.includes("\\") ||
    path.basename(filename) !== filename
  )
    throw new ProfilePhotoValidationError("The photo filename is invalid.");
  if (file.size < 1)
    throw new ProfilePhotoValidationError("The photo file is empty.");
  if (file.size > MAX_PROFILE_PHOTO_BYTES)
    throw new ProfilePhotoValidationError(
      "The profile photo must be 5 MB or smaller.",
    );
  if (!Object.hasOwn(formats, file.type))
    throw new ProfilePhotoValidationError("Upload a JPEG, PNG or WEBP photo.");
  const mimeType = file.type as keyof typeof formats;
  const extension = path.extname(filename).toLowerCase();
  if (!(formats[mimeType].extensions as readonly string[]).includes(extension))
    throw new ProfilePhotoValidationError(
      "The photo extension does not match its file type.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matches(mimeType, bytes))
    throw new ProfilePhotoValidationError(
      "The photo contents do not match its file type.",
    );
  const storageKey = `${randomUUID()}${formats[mimeType].storedExtension}`;
  await mkdir(root(), { recursive: true });
  await writeFile(path.join(root(), storageKey), bytes, { flag: "wx" });
  return { storageKey, mimeType, fileSize: bytes.length };
}

function safePath(key: string) {
  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(key))
    throw new Error("Invalid private profile-photo key.");
  return path.join(root(), key);
}

export async function readProfilePhoto(key: string) {
  return readFile(safePath(key));
}

export async function deleteProfilePhoto(key: string) {
  try {
    await unlink(safePath(key));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
