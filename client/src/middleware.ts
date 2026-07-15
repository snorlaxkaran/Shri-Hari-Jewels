import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/shop/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/login" ||
    pathname.startsWith("/platform")
  ) {
    return NextResponse.next();
  }

  const isLocalhost =
    host.includes("localhost") || host.includes("127.0.0.1");
  const isMainDomain =
    isLocalhost ||
    host.includes("vercel.app") ||
    host.includes("shri-hari-jewels");

  if (isMainDomain) {
    return NextResponse.next();
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/storefront/resolve?host=${encodeURIComponent(host)}`,
      { next: { revalidate: 60 } },
    );
    if (res.ok) {
      const { slug } = (await res.json()) as { slug: string };
      const url = request.nextUrl.clone();
      url.pathname = `/shop/${slug}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
  } catch {
    // fall through
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
