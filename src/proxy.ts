import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host") || url.host;
  const hostname = new URL(`http://${host}`).hostname;
  const local = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (process.env.NODE_ENV === "production" && url.protocol === "http:" && !local) {
    const secureUrl = url.clone();
    secureUrl.protocol = "https:";
    secureUrl.host = host;
    secureUrl.port = "";
    return NextResponse.redirect(secureUrl, 308);
  }
  return NextResponse.next();
}
