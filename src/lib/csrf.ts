import "server-only";

export function hasValidMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    if (requestUrl.protocol === originUrl.protocol && requestUrl.host === originUrl.host) return true;
    const workerHost = "pimx-eltex.mohammadrezaabedinpoor6.workers.dev";
    const isPagesHost = (host: string) => host === "pimxeltex.pages.dev" || host.endsWith(".pimxeltex.pages.dev");
    // OpenNext currently exposes "https://undefined" as request.url for Pages Service binding calls.
    return requestUrl.protocol === "https:"
      && originUrl.protocol === "https:"
      && isPagesHost(originUrl.hostname)
      && (requestUrl.hostname === workerHost || requestUrl.hostname === "undefined");
  } catch {
    return false;
  }
}

export function csrfError() {
  return Response.json({ message: "This request was rejected for security reasons." }, { status: 403 });
}
