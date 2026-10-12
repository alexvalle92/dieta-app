import { NextRequest, NextResponse } from "next/server"
import { requirePatient } from "@/lib/auth/guards"
import { createSession } from "@/lib/auth/session"
import { getContainer } from "@/lib/container"
import { readInput } from "@/lib/http/read-input"
import { PASSWORD_LENGTH_MESSAGE } from "@/lib/validation/password"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const text = (value: unknown) => typeof value === "string" && value !== ""

/** Troca de senha do cliente logado. É a única rota liberada enquanto a senha temporária não foi trocada. */
export async function POST(request: NextRequest) {
  const c = getContainer()
  try {
    const guard = await requirePatient({ allowPendingPasswordChange: true })
    if (!guard.ok) return guard.response

    const input = await readInput(request)
    if (!text(input.currentPassword) || !text(input.newPassword)) {
      return NextResponse.json({ error: "Senha atual e nova senha são obrigatórias" }, { status: 400 })
    }

    const result = await c.changePatientPassword(guard.session.userId, input)
    switch (result) {
      case "invalid_new":
        return NextResponse.json({ error: PASSWORD_LENGTH_MESSAGE }, { status: 400 })
      case "wrong_current":
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })
      case "not_found":
        return NextResponse.json({ error: "Paciente não encontrado" }, { status: 404 })
    }

    // Sessão nova, sem a marca de troca pendente: libera a navegação.
    await createSession({ ...guard.session, mustChangePassword: false })
    return NextResponse.json({ success: true, message: "Senha atualizada com sucesso" })
  } catch (error) {
    c.log.error("auth.reset_password.error", { message: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Erro ao redefinir senha" }, { status: 500 })
  }
}
