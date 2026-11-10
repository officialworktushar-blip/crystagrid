export function getMediaUrl(filePath: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const normalizedPath = filePath.replace(/^\/+/, "");
  const encodedPath = normalizedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}/storage/v1/object/public/media/${encodedPath}`;
}
