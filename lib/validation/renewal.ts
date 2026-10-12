import { z } from "zod"
import { RENEWAL_SECTIONS, type ChoiceQuestion, type NumberQuestion } from "@/lib/renewal/questions"

export type RenewalAnswers = {
  faixa_etaria: string
  sexo_biologico: string
  tipo_fisico: string
  peso_comportamento: string
  sobremesa: string
  rotina_dia: string
  sono: string
  agua: string
  breakfast_foods: string[]
  almoco: string[]
  lanche_tarde: string[]
  jantar: string[]
  habitos: string[]
  altura_cm: number
  peso_kg: number
  meta_peso_30d: number
}

const QUESTIONS = RENEWAL_SECTIONS.flatMap((section) => section.questions)

/** Número dentro de [min, max] e múltiplo de `step` (com folga para o erro de ponto flutuante). */
function isValidNumber(q: NumberQuestion, n: number): boolean {
  if (!Number.isFinite(n) || n < q.min || n > q.max) return false
  const steps = n / q.step
  return Math.abs(steps - Math.round(steps)) < 1e-6
}

// O schema sai das perguntas: opção nova ou removida vale para a tela e para a validação ao mesmo tempo.
function questionSchema(q: ChoiceQuestion | NumberQuestion): z.ZodTypeAny {
  if (q.type === "number") {
    return z.number().refine((n) => isValidNumber(q, n))
  }
  const allowed = new Set(q.options.map((o) => o.value))
  const option = z.string().refine((v) => allowed.has(v))
  if (q.type === "single") return option
  return z
    .array(option)
    .min(1)
    .refine((items) => new Set(items).size === items.length)
}

const answersSchema = z.object(Object.fromEntries(QUESTIONS.map((q) => [q.key, questionSchema(q)])))

const bodySchema = z.object({
  submissionId: z.string().uuid(),
  answers: answersSchema,
})

/** Campos desconhecidos em `answers` são descartados: o que segue adiante é só o que a tela pergunta. */
export function parseRenewalBody(
  body: unknown,
): { ok: true; value: { submissionId: string; answers: RenewalAnswers } } | { ok: false } {
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return { ok: false }
  return {
    ok: true,
    value: { submissionId: parsed.data.submissionId, answers: parsed.data.answers as RenewalAnswers },
  }
}

// Peso e meta mudam a cada ciclo: a tela abre sempre com eles em branco (§8.1).
const BLANK_ON_OPEN = new Set(["peso_kg", "meta_peso_30d"])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** O quiz grava altura como texto ("165"); aceita número ou texto só com dígitos. */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value
  if (typeof value === "string" && /^\d+([.,]\d+)?$/.test(value.trim())) return Number(value.trim().replace(",", "."))
  return null
}

/**
 * O que dá para aproveitar de um envio antigo (`quiz_responses.answers`, que é JSON livre: pode vir
 * `null`, lista, texto ou campos de tipo errado). Só entra o que ainda é uma opção válida; o resto
 * fica de fora e a tela mostra em branco. Nunca lança.
 */
export function prefillAnswers(previous: Record<string, unknown> | null): Partial<RenewalAnswers> {
  if (!isPlainObject(previous)) return {}

  const out: Record<string, unknown> = {}
  for (const q of QUESTIONS) {
    if (BLANK_ON_OPEN.has(q.key)) continue
    // Só chave própria: nada herdado do protótipo.
    if (!Object.prototype.hasOwnProperty.call(previous, q.key)) continue
    const value = previous[q.key]

    if (q.type === "number") {
      const n = toNumber(value)
      if (n !== null && isValidNumber(q, n)) out[q.key] = n
      continue
    }

    const allowed = new Set(q.options.map((o) => o.value))
    if (q.type === "single") {
      if (typeof value === "string" && allowed.has(value)) out[q.key] = value
      continue
    }

    if (!Array.isArray(value)) continue
    const kept = [...new Set(value.filter((item): item is string => typeof item === "string" && allowed.has(item)))]
    if (kept.length > 0) out[q.key] = kept
  }
  return out as Partial<RenewalAnswers>
}

/**
 * O envio no formato do quiz, que o `POST /api/renewals` do v0-tami-forms valida e grava: números em
 * texto, `imc` calculado aqui e os dados pessoais lidos do cadastro (nunca do corpo do pedido).
 * `whatsapp` é o telefone guardado: o v0-tami-forms atualiza o paciente (por CPF) com o telefone
 * recebido, então mandar outro valor sobrescreveria o cadastro.
 */
export function buildSubmissionAnswers(
  patient: { name: string; email: string; phone: string; cpf: string },
  answers: RenewalAnswers,
): Record<string, unknown> {
  const heightM = answers.altura_cm / 100
  return {
    faixa_etaria: answers.faixa_etaria,
    sexo_biologico: answers.sexo_biologico,
    tipo_fisico: answers.tipo_fisico,
    peso_comportamento: answers.peso_comportamento,
    sobremesa: answers.sobremesa,
    rotina_dia: answers.rotina_dia,
    sono: answers.sono,
    agua: answers.agua,
    breakfast_foods: answers.breakfast_foods,
    almoco: answers.almoco,
    lanche_tarde: answers.lanche_tarde,
    jantar: answers.jantar,
    habitos: answers.habitos,
    altura_cm: String(answers.altura_cm),
    peso_kg: String(answers.peso_kg),
    meta_peso_30d: String(answers.meta_peso_30d),
    imc: (answers.peso_kg / (heightM * heightM)).toFixed(2),
    nome_completo: patient.name,
    email: patient.email,
    whatsapp: patient.phone,
    cpf: patient.cpf,
  }
}
