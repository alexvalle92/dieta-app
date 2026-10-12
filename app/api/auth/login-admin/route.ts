import { NextRequest, NextResponse } from "next/server"
import { createSession } from "@/lib/auth/session"
import { getContainer } from "@/lib/container"
import { clientIp } from "@/lib/http/client-ip"
import { readInput } from "@/lib/http/read-input"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const text = (value: unknown) => typeof value === "string" && value !== ""

export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    if (!c.loginLimiter.hit(clientIp(request))) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 })
    }

    const input = await readInput(request)
    if (!text(input.email) || !text(input.password)) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 })
    }

    const result = await c.loginAdmin(input)
    if (!result.ok) {
      return NextResponse.json({ error: "E-mail ou senha inválidos" }, { status: 401 })
    }

    await createSession(result.session)
    const { userId, name, email } = result.session
    return NextResponse.json({ success: true, user: { id: userId, name, email } })
  } catch (error) {
    c.log.error("auth.login_admin.error", { message: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Erro ao processar login" }, { status: 500 })
  }
}
