import { z } from "zod"
import type { RetryTarget } from "@/lib/forms-client"
import type { AppLogFilter, FailedItemType, LogLevel } from "@/lib/repos/types"

export const APP_LOGS_MAX_RANGE_DAYS = 90
export const APP_LOGS_DEFAULT_RANGE_DAYS = 7
const MAX_PAGE = 10_000
const MAX_AREA_LENGTH = 40
const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_LEVELS: LogLevel[] = ["warn", "error"]

export const retryRequestSchema = z
  .object({
    type: z.enum(["payment", "plan_generation", "notification"]),
    id: z.string().min(1).max(64),
  })
  .strict()

/** Monta o alvo do `/api/jobs/retry`; a rota nunca repassa um corpo arbitrário. */
export function toRetryTarget(r: { type: FailedItemType; id: string }): RetryTarget {
  if (r.type === "payment") return { paymentId: r.id }
  if (r.type === "plan_generation") return { planGenerationId: r.id }
  return { notificationId: r.id }
}

// Só data e hora com fuso: uma data sem hora seria lida no fuso do servidor.
const isoInstant = z.string().datetime({ offset: true })
const levelSchema = z.enum(["info", "warn", "error"])
const areaSchema = z.string().min(1).max(MAX_AREA_LENGTH)

function parseLevels(raw: string | null): LogLevel[] | null {
  if (raw === null) return DEFAULT_LEVELS
  const parts = raw.split(",")
  const levels: LogLevel[] = []
  for (const part of parts) {
    const level = levelSchema.safeParse(part)
    if (!level.success || levels.includes(level.data)) return null
    levels.push(level.data)
  }
  return levels
}

function parsePage(raw: string | null): number | null {
  if (raw === null) return 1
  if (!/^\d+$/.test(raw)) return null
  const page = Number(raw)
  return page >= 1 && page <= MAX_PAGE ? page : null
}

/** Padrões: `to` = agora, `from` = 7 dias antes de `to`, níveis `warn` e `error`, página 1. */
export function parseAppLogsQuery(
  params: URLSearchParams,
  now: Date,
): { ok: true; filter: AppLogFilter } | { ok: false } {
  const fromRaw = params.get("from")
  const toRaw = params.get("to")
  const areaRaw = params.get("area")

  const toParsed = toRaw === null ? null : isoInstant.safeParse(toRaw)
  const fromParsed = fromRaw === null ? null : isoInstant.safeParse(fromRaw)
  if ((toParsed && !toParsed.success) || (fromParsed && !fromParsed.success)) return { ok: false }
  const to = toParsed?.success ? new Date(toParsed.data) : now
  const from = fromParsed?.success ? new Date(fromParsed.data) : new Date(to.getTime() - APP_LOGS_DEFAULT_RANGE_DAYS * DAY_MS)
  if (!(from < to) || to.getTime() - from.getTime() > APP_LOGS_MAX_RANGE_DAYS * DAY_MS) return { ok: false }

  const area = areaRaw === null ? undefined : areaSchema.safeParse(areaRaw)
  if (area && !area.success) return { ok: false }

  const levels = parseLevels(params.get("level"))
  const page = parsePage(params.get("page"))
  if (levels === null || page === null) return { ok: false }

  return { ok: true, filter: { from, to, ...(area ? { area: area.data } : {}), levels, page } }
}
