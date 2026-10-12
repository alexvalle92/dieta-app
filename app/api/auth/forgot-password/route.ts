import { NextRequest, NextResponse, after } from "next/server"
import { getContainer } from "@/lib/container"
import { clientIp } from "@/lib/http/client-ip"
import { readInput } from "@/lib/http/read-input"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Pedido de "esqueci a senha" (§7.1 do spec): grava o token e as mensagens e, depois da resposta,
 * pede ao v0-tami-forms o envio imediato. Se esse pedido falhar, o job de 2 minutos de lá envia.
 */
export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    if (!c.forgotLimiter.hit(clientIp(request))) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 })
    }

    const input = await readInput(request)
    if (typeof input.cpf !== "string" || input.cpf === "") {
      return NextResponse.json({ error: "CPF é obrigatório" }, { status: 400 })
    }

    const result = await c.requestPasswordReset(input.cpf)
    if (result.kind === "invalid_cpf") return NextResponse.json({ error: "CPF inválido" }, { status: 400 })
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "CPF não encontrado no sistema" }, { status: 404 })
    }

    const { notificationIds } = result
    after(async () => {
      await c.forms.dispatchNotifications(notificationIds)
    })
    return NextResponse.json({ success: true, email: result.maskedEmail })
  } catch (error) {
    c.log.error("auth.forgot_password.error", { message: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json(
      { error: "Erro ao processar solicitação de recuperação. Tente novamente mais tarde." },
      { status: 500 },
    )
  }
}
