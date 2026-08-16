import { createHash } from "node:crypto";
import { getRequestHeader } from "@tanstack/react-start/server";

const buckets = new Map<string, number[]>();

export function enforcePublicRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
) {
  const forwarded = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || getRequestHeader("x-real-ip") || "unknown";
  const key = createHash("sha256")
    .update(`${scope}:${address}:${identity.trim().toLowerCase()}`)
    .digest("hex");
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (time) => now - time < windowMs,
  );
  if (recent.length >= limit) return false;
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000)
    for (const [bucketKey, values] of buckets)
      if (!values.some((time) => now - time < windowMs))
        buckets.delete(bucketKey);
  return true;
}
