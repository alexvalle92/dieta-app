import { NextRequest, NextResponse } from "next/server"
import { requirePatient } from "@/lib/auth/guards"
import { getContainer } from "@/lib/container"
import { readJsonBody } from "@/lib/http/read-json"
import { RENEWAL_BLOCK_MESSAGES } from "@/lib/renewal/messages"
import { parseRenewalBody } from "@/lib/validation/renewal"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Corpo máximo do formulário: 64 KB, o mesmo teto do POST /api/renewals do v0-tami-forms. */
const MAX_BODY_BYTES = 64 * 1024

const NOT_FOUND = "Plano alimentar não encontrado"

/** Dados da tela de renovação (§8.2): permissão, motivo, respostas do último envio e estado. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = getContainer()
  try {
    const guard = await requirePatient()
    if (!guard.ok) return guard.response

    const { id } = await params
    const form = await c.renewal.form(id, guard.session.userId)
    if (form === "not_found") return NextResponse.json({ error: NOT_FOUND }, { status: 404 })

    return NextResponse.json(form)
  } catch (error) {
    c.log.error("client.renewal.error", { message: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Erro ao carregar o formulário" }, { status: 500 })
  }
}

/** Envio do formulário (§8.2): sessão → plano → limite → permissão → validação → v0-tami-forms. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const c = getContainer()
  try {
    const guard = await requirePatient()
    if (!guard.ok) return guard.response
    const patientId = guard.session.userId

    const { id } = await params
    const checked = await c.renewal.check(id, patientId)
    if (checked === "not_found") return NextResponse.json({ error: NOT_FOUND }, { status: 404 })

    // Depois de achar o plano (quem não é dono recebe 404 sem gastar a cota) e antes de tudo que custa.
    if (!c.renewalLimiter.hit(patientId)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 },
      )
    }

    if (checked.reason) {
      return NextResponse.json(
        { error: RENEWAL_BLOCK_MESSAGES[checked.reason], code: checked.reason },
        { status: 409 },
      )
    }

    const invalid = () =>
      NextResponse.json({ error: "Respostas inválidas. Confira os campos e tente novamente." }, { status: 400 })

    const body = await readJsonBody(request, MAX_BODY_BYTES)
    if (!body.ok) return invalid()
    const parsed = parseRenewalBody(body.value)
    if (!parsed.ok) return invalid()

    const result = await c.renewal.submit({
      planId: id,
      patientId,
      submissionId: parsed.value.submissionId,
      answers: parsed.value.answers,
    })

    if (result === "not_found") return NextResponse.json({ error: NOT_FOUND }, { status: 404 })
    if (result === "forms_unavailable") {
      return NextResponse.json(
        { error: "Não foi possível enviar seus dados agora. Tente novamente em instantes." },
        { status: 502 },
      )
    }
    // Entre o `check` da rota e o do serviço o estado pode ter mudado (pagamento confirmado).
    if ("blocked" in result) {
      return NextResponse.json(
        { error: RENEWAL_BLOCK_MESSAGES[result.blocked], code: result.blocked },
        { status: 409 },
      )
    }

    return NextResponse.json({ success: true, paymentUrl: result.paymentUrl })
  } catch (error) {
    c.log.error("client.renewal.error", { message: error instanceof Error ? error.name : "unknown" })
    return NextResponse.json({ error: "Erro ao enviar o formulário" }, { status: 500 })
  }
}
