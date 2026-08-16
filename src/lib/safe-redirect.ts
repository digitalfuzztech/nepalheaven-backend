function containsUnsafeCharacter(value: string) {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return character === "\\" || code <= 31 || code === 127;
  });
}

export function safeReturnPath(value: unknown, fallback: string) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  )
    return fallback;
  if (containsUnsafeCharacter(value)) return fallback;
  let decoded = value;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return fallback;
    }
    if (
      !decoded.startsWith("/") ||
      decoded.startsWith("//") ||
      containsUnsafeCharacter(decoded)
    )
      return fallback;
  }
  try {
    const parsed = new URL(value, "https://nepalheaven.invalid");
    if (parsed.origin !== "https://nepalheaven.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
