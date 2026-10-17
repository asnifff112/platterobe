import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("platterobe_admin_session")?.value;

  // Transparently rewrite /index to internal /product-index to resolve Vercel Edge index.html collision
  if (pathname === "/index") {
    const url = request.nextUrl.clone();
    url.pathname = "/product-index";
    return NextResponse.rewrite(url);
  }

  // Protect all /admin routes except /admin/login
  if (pathname === "/admin" || (pathname.startsWith("/admin/") && pathname !== "/admin/login")) {
    if (!sessionToken) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in, redirect away from /admin/login to /admin
  if (pathname === "/admin/login") {
    if (sessionToken) {
      const adminUrl = new URL("/admin", request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ["/admin", "/admin/:path*", "/index"],
};
