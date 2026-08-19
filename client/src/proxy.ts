import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TENANT_CACHE_TTL_MS = 10 * 60_000;
const tenantCache = new Map<string, { slug: string; expiresAt: number }>();

const getCachedTenantSlug = (host: string): string | null => {
  const entry = tenantCache.get(host);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tenantCache.delete(host);
    return null;
  }
  return entry.slug;
};

const setCachedTenantSlug = (host: string, slug: string) => {
  tenantCache.set(host, { slug, expiresAt: Date.now() + TENANT_CACHE_TTL_MS });
};

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/shop/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/onboarding") ||
    pathname === "/login" ||
    pathname.startsWith("/platform") ||
    pathname.startsWith("/i/") ||
    pathname.startsWith("/t/") ||
    pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|css|js|woff2?)$/)
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

  const cachedSlug = getCachedTenantSlug(host);
  if (cachedSlug) {
    const url = request.nextUrl.clone();
    url.pathname = `/shop/${cachedSlug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  try {
    const res = await fetch(
      `${API_BASE}/api/storefront/resolve?host=${encodeURIComponent(host)}`,
      { next: { revalidate: 600 } },
    );
    if (res.ok) {
      const { slug } = (await res.json()) as { slug: string };
      setCachedTenantSlug(host, slug);
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
