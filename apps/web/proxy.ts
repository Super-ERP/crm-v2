import { NextResponse, type NextRequest } from "next/server"
import { getDeploymentAccess } from "@/lib/deployment-control"
import { getSessionCookie } from "better-auth/cookies"

/**
 * Enforce the vendor service switch before customer routes, then perform
 * optimistic session redirects. Auth + RBAC and service access are also
 * enforced at server/API data boundaries. (Next 16: proxy.ts)
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  // Signed internal agent endpoints retain their own authentication and must
  // stay reachable so a disabled service can receive its next enabled lease.
  if (path === "/api/health" || path.startsWith("/api/internal/")) return NextResponse.next()
  const access = await getDeploymentAccess()
  if (access.mode === "service_disabled") {
    const message = "Service is disabled. Contact your service provider."
    return path.startsWith("/api/")
      ? NextResponse.json({ error: { code: "SERVICE_DISABLED", message } }, { status: 403 })
      : new NextResponse(message, { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } })
  }
  if (path.startsWith("/api/")) return NextResponse.next()

  const sessionCookie = getSessionCookie(request)
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname === "/sign-in"

  if (!sessionCookie && !isAuthRoute) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }
  if (sessionCookie && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Exclude only framework assets and known public files. A dot in a customer
  // route (or API export filename) must never bypass the service switch.
  matcher: ["/((?!_next/static|_next/image|favicon.ico$|prefs-init.js$|file.svg$|globe.svg$|vercel.svg$|next.svg$|window.svg$).*)"],
}
