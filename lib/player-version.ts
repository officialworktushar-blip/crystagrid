export function getPlayerVersion(): string {
  const version = process.env.VERCEL_GIT_COMMIT_SHA;

  if (typeof version === "string") {
    const trimmed = version.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return "dev";
}
