import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-token"

// Importa só `session-token` (jose): este arquivo roda no runtime edge, sem Node nem MySQL.
const PUBLIC_CLIENT_PREFIXES = ["/cliente/login", "/cliente/esqueci-senha", "/cliente/redefinir-senha"]
const CHANGE_PASSWORD_PATH = "/cliente/recuperar-senha"

const redirect = (request: NextRequest, path: string) => NextResponse.redirect(new URL(path, request.url))

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/api/")) return NextResponse.next()

  const isClientPage = pathname.startsWith("/cliente") && !PUBLIC_CLIENT_PREFIXES.some((p) => pathname.startsWith(p))
  const isAdminPage = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")
  if (!isClientPage && !isAdminPage) return NextResponse.next()

  const session = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? "",
  )

  if (isClientPage) {
    if (!session || session.userType !== "patient") return redirect(request, "/cliente/login")
    // Senha temporária ainda não trocada: só a tela de troca está liberada (§6.5 do spec).
    if (session.mustChangePassword && !pathname.startsWith(CHANGE_PASSWORD_PATH)) {
      return redirect(request, CHANGE_PASSWORD_PATH)
    }
  } else if (!session || session.userType !== "admin") {
    return redirect(request, "/admin/login")
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/cliente/:path*", "/admin/:path*"],
}
