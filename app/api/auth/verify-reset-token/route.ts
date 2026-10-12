import { NextRequest, NextResponse } from "next/server"
import { getContainer } from "@/lib/container"
import { readInput } from "@/lib/http/read-input"
import { PASSWORD_LENGTH_MESSAGE } from "@/lib/validation/password"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const text = (value: unknown) => typeof value === "string" && value !== ""

/** Redefine a senha com o token do link enviado por e-mail/WhatsApp (§7.2 do spec). */
export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const input = await readInput(request)
    if (!text(input.token) || !text(input.newPassword)) {
      return NextResponse.json({ error: "Token e nova senha são obrigatórios" }, { status: 400 })
    }

    const result = await c.redeemPasswordReset(input)
    switch (result) {
      case "invalid_new":
        return NextResponse.json({ error: PASSWORD_LENGTH_MESSAGE }, { status: 400 })
      case "invalid":
        return NextResponse.json({ error: "Token inválido ou já utilizado" }, { status: 400 })
      case "expired":
        return NextResponse.json({ error: "Token expirado. Solicite um novo link de recuperação" }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Senha redefinida com sucesso!" })
  } catch (error) {
    c.log.error("auth.verify_reset_token.error", { message: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 })
  }
}
