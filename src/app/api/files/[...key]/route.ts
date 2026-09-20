export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  try {
    const { key } = await params;
    const objectKey = key.join("/");
    if (!/^episode-bundles\/[0-9a-f-]{36}\/(?:files\/[a-zA-Z0-9._ /-]+|[a-zA-Z0-9._-]+\.zip)$/.test(objectKey) || key.some((segment) => segment === "." || segment === "..")) {
      return new Response("Not found", { status: 404 });
    }
    const { getCloudflareContext } = await import("@opennextjs/cloudflare"); const { env } = await getCloudflareContext({ async: true });
    const object = await (env.MEDIA as R2Bucket).get(objectKey);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("etag", object.httpEtag); headers.set("cache-control", "public, max-age=3600"); headers.set("x-content-type-options", "nosniff"); headers.set("cross-origin-resource-policy", "cross-origin");
    if (headers.get("content-type")?.startsWith("text/html")) headers.set("content-security-policy", "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' http: https:; style-src 'unsafe-inline' http: https:; img-src data: blob: http: https:; font-src data: http: https:; connect-src http: https:; media-src data: blob: http: https:; worker-src blob:; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts allow-forms allow-modals allow-pointer-lock");
    if (headers.get("content-type")?.startsWith("image/svg+xml")) headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    if (new URL(request.url).searchParams.has("download")) headers.set("content-disposition", `attachment; filename="${objectKey.split("/").pop()}"`);
    return new Response(object.body, { headers });
  } catch { return new Response("Storage unavailable", { status: 503 }); }
}
