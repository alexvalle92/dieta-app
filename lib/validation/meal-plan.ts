const STATUSES = ["active", "completed", "cancelled"]
const MAX_TITLE_LENGTH = 200

export type PlanFields = {
  title?: string
  description?: string | null
  startDate?: string
  endDate?: string | null
  status?: string
  planData?: Record<string, unknown>
}

export type PlanFieldsResult = { ok: true; value: PlanFields } | { ok: false; error: string }

const DATES_ERROR = "Datas devem estar no formato AAAA-MM-DD"

/** Data de calendário real no formato AAAA-MM-DD (rejeita 2026-02-30). */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Valida os campos de um plano vindos do corpo da requisição (chaves em snake_case, como o front
 * envia). Só devolve os campos presentes: serve à criação e à atualização. Presença obrigatória
 * (título, data de início, paciente) é checada por quem chama.
 */
export function parsePlanFields(body: Record<string, unknown>): PlanFieldsResult {
  const value: PlanFields = {}

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "" || body.title.trim().length > MAX_TITLE_LENGTH) {
      return { ok: false, error: "O título deve ter até 200 caracteres" }
    }
    value.title = body.title.trim()
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") value.description = null
    else if (typeof body.description === "string") value.description = body.description
    else return { ok: false, error: "description deve ser texto" }
  }

  if (body.start_date !== undefined) {
    if (!isCalendarDate(body.start_date)) return { ok: false, error: DATES_ERROR }
    value.startDate = body.start_date
  }

  if (body.end_date !== undefined) {
    if (body.end_date === null || body.end_date === "") value.endDate = null
    else if (isCalendarDate(body.end_date)) value.endDate = body.end_date
    else return { ok: false, error: DATES_ERROR }
  }

  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) {
      return { ok: false, error: "status deve ser active, completed ou cancelled" }
    }
    value.status = body.status
  }

  if (body.plan_data !== undefined) {
    if (!isPlainObject(body.plan_data)) return { ok: false, error: "plan_data deve ser um objeto JSON válido" }
    value.planData = body.plan_data
  }

  return { ok: true, value }
}
