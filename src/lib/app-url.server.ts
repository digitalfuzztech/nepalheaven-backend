export function getAppUrl() {
  const configured = process.env["APP_URL"]?.trim();
  if (!configured)
    throw new Error("APP_URL is required for transactional links.");
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }
  if (!(["http:", "https:"] as string[]).includes(url.protocol))
    throw new Error("APP_URL must use http or https.");
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "APP_URL must not contain credentials, a query, or a hash.",
    );
  if (url.pathname !== "/")
    throw new Error("APP_URL must be an origin without a path.");
  if (process.env["NODE_ENV"] === "production" && url.protocol !== "https:")
    throw new Error("Production APP_URL must use https.");
  return url.origin;
}

export function buildAppUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\"))
    throw new Error(
      "Transactional URL paths must be same-site absolute paths.",
    );
  return `${getAppUrl()}${path}`;
}
