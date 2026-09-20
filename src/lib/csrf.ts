import "server-only";

export function hasValidMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return requestUrl.protocol === originUrl.protocol && requestUrl.host === originUrl.host;
  } catch {
    return false;
  }
}

export function csrfError() {
  return Response.json({ message: "This request was rejected for security reasons." }, { status: 403 });
}
