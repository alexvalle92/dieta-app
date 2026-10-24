'use client'

import { Suspense, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, RefreshCw, RotateCcw } from "lucide-react"
import { toast, Toaster } from "sonner"
import { AdminNav } from "@/components/admin-nav"
import { Pagination } from "@/components/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  failureHint,
  failureTypeLabel,
  formatSaoPauloDateTime,
  notificationLabel,
  saoPauloDayRange,
} from "@/lib/admin/failures-format"
import { addDaysISO, todayInSaoPaulo } from "@/lib/time"
import type { Channel, FailedItemType, LogLevel } from "@/lib/repos/types"

type Tab = "falhas" | "logs"

/** Como a API entrega: as datas chegam em texto ISO. */
interface FailureItem {
  type: FailedItemType
  id: string
  patient: { id: string; name: string; email: string }
  lastError: {
    step: string
    message: string
    attempt?: number
    at?: string
    httpStatus?: number
    responseBody?: string
  } | null
  attempts: number
  channel?: Channel
  kind?: string
}

interface LogRow {
  id: number
  ts: string
  level: string
  event: string
  area: string
  fields: Record<string, unknown>
}

interface LogsResponse {
  rows: LogRow[]
  total: number
  areas: string[]
  pageSize: number
}

const ALL_AREAS = "__todas__"
const LEVELS: LogLevel[] = ["error", "warn", "info"]
const LEVEL_BADGE: Record<string, "destructive" | "secondary" | "outline"> = {
  error: "destructive",
  warn: "secondary",
  info: "outline",
}

const itemKey = (item: Pick<FailureItem, "type" | "id">) => `${item.type}:${item.id}`
const itemLabel = (item: FailureItem) =>
  item.type === "notification" && item.channel && item.kind
    ? notificationLabel(item.channel, item.kind)
    : failureTypeLabel(item.type)

function FailuresTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [items, setItems] = useState<FailureItem[] | null>(null)
  const [confirming, setConfirming] = useState<FailureItem | null>(null)
  const [retrying, setRetrying] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/failures')
      if (response.status === 401) return onUnauthorized()
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Erro ao carregar as falhas')
        setItems((current) => current ?? [])
        return
      }
      setItems(data.items)
    } catch {
      toast.error('Erro ao carregar as falhas')
      setItems((current) => current ?? [])
    }
  }, [onUnauthorized])

  useEffect(() => {
    load()
  }, [load])

  const retry = async (item: FailureItem) => {
    const key = itemKey(item)
    setRetrying((current) => new Set(current).add(key))
    try {
      const response = await fetch('/api/admin/failures/retry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: item.type, id: item.id }),
      })
      if (response.status === 401) return onUnauthorized()
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data.error || 'Não foi possível reexecutar agora')
        return
      }
      if (data.reopened > 0) {
        toast.success('Reaberto. O processamento roda em seguida; se falhar de novo, o item volta para esta lista.')
      } else {
        toast.info('Este item já não está em falha.')
      }
      await load()
    } catch {
      toast.error('Não foi possível reexecutar agora')
    } finally {
      setRetrying((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Itens que esgotaram as tentativas. Corrija a causa e reexecute.
        </p>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {items === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Nenhuma falha pendente.</CardContent>
        </Card>
      ) : (
        items.map((item) => {
          const error = item.lastError
          const isRetrying = retrying.has(itemKey(item))
          return (
            <Card key={itemKey(item)}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <Badge variant="secondary">{itemLabel(item)}</Badge>
                  <CardTitle className="text-base">
                    <Link href={`/admin/pacientes/${item.patient.id}`} className="hover:underline">
                      {item.patient.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>{item.patient.email}</CardDescription>
                </div>
                <Button size="sm" className="gap-2" disabled={isRetrying} onClick={() => setConfirming(item)}>
                  {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Reexecutar
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {error ? (
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">{error.step}</span>: {error.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        error.httpStatus !== undefined ? `HTTP ${error.httpStatus}` : null,
                        error.attempt !== undefined ? `tentativa ${error.attempt}` : null,
                        error.at ? formatSaoPauloDateTime(error.at) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sem detalhe do erro</p>
                )}
                {error?.responseBody && (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">Ver resposta</summary>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                      {error.responseBody}
                    </pre>
                  </details>
                )}
                <p className="text-xs text-muted-foreground">{failureHint(item.type)}</p>
              </CardContent>
            </Card>
          )
        })
      )}

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Reexecutar {confirming ? failureTypeLabel(confirming.type).toLowerCase() : ''} de{' '}
              {confirming?.patient.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>O item volta para a fila e o processamento roda em seguida.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirming && retry(confirming)}>Reexecutar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function LogsTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [fromDay, setFromDay] = useState(() => addDaysISO(todayInSaoPaulo(new Date()), -7))
  const [toDay, setToDay] = useState(() => todayInSaoPaulo(new Date()))
  const [area, setArea] = useState(ALL_AREAS)
  const [levels, setLevels] = useState<Record<LogLevel, boolean>>({ error: true, warn: true, info: false })
  const [page, setPage] = useState(1)
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const levelsParam = LEVELS.filter((level) => levels[level]).join(',')

  useEffect(() => {
    if (!fromDay || !toDay || fromDay > toDay) {
      toast.error('Período inválido')
      return
    }
    const { from, to } = saoPauloDayRange(fromDay, toDay)
    const params = new URLSearchParams({ from, to, level: levelsParam, page: String(page) })
    if (area !== ALL_AREAS) params.set('area', area)

    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/app-logs?${params}`)
      .then(async (response) => {
        if (cancelled) return
        if (response.status === 401) return onUnauthorized()
        const body = await response.json()
        if (!response.ok) {
          toast.error(body.error || 'Erro ao carregar os logs')
          return
        }
        setData(body)
        // Página além do fim (filtro mudou ou logs foram apagados): volta para a última.
        const pages = Math.max(1, Math.ceil(body.total / body.pageSize))
        if (body.rows.length === 0 && page > pages) setPage(pages)
      })
      .catch(() => !cancelled && toast.error('Erro ao carregar os logs'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [fromDay, toDay, area, levelsParam, page, onUnauthorized])

  const changeFilter = (apply: () => void) => {
    apply()
    setPage(1)
  }

  const toggleLevel = (level: LogLevel, on: boolean) => {
    // Pelo menos um nível fica ligado.
    if (!on && LEVELS.filter((l) => levels[l]).length === 1) return
    changeFilter(() => setLevels((current) => ({ ...current, [level]: on })))
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="logs-de">De</label>
            <Input id="logs-de" type="date" value={fromDay} onChange={(e) => changeFilter(() => setFromDay(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="logs-ate">Até</label>
            <Input id="logs-ate" type="date" value={toDay} onChange={(e) => changeFilter(() => setToDay(e.target.value))} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Área</label>
            <Select value={area} onValueChange={(value) => changeFilter(() => setArea(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_AREAS}>Todas</SelectItem>
                {(data?.areas ?? []).map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Nível</label>
            <div className="flex items-center gap-4 pt-1">
              {LEVELS.map((level) => (
                <label key={level} className="flex items-center gap-2 text-sm">
                  <Switch checked={levels[level]} onCheckedChange={(on) => toggleLevel(level, on)} />
                  {level}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {data === null ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data.rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {loading ? 'Carregando…' : 'Nenhum log no período.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.rows.map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-2 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatSaoPauloDateTime(row.ts, { seconds: true })}
                  </span>
                  <Badge variant={LEVEL_BADGE[row.level] ?? 'outline'}>{row.level}</Badge>
                  <span className="text-xs text-muted-foreground">{row.area}</span>
                  <span className="font-medium">{row.event}</span>
                </div>
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Ver campos</summary>
                  <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(row.fields, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function ErrosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab: Tab = searchParams.get('aba') === 'logs' ? 'logs' : 'falhas'
  const [ready, setReady] = useState(false)

  const goToLogin = useCallback(() => router.push('/admin/login'), [router])

  useEffect(() => {
    fetch('/api/auth/session')
      .then(async (response) => {
        const data = response.ok ? await response.json() : null
        if (data?.user?.userType !== 'admin') return goToLogin()
        setReady(true)
      })
      .catch(goToLogin)
  }, [goToLogin])

  const selectTab = (next: Tab) => router.replace(`/admin/erros?aba=${next}`)

  if (!ready) return null

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Erros</h1>
          <p className="mt-2 text-muted-foreground">Falhas para reexecutar e logs de erro do servidor</p>
        </div>

        <div className="mb-6 flex gap-2">
          <Button variant={tab === 'falhas' ? 'default' : 'outline'} className={tab === 'falhas' ? '' : 'bg-transparent'} onClick={() => selectTab('falhas')}>
            Falhas
          </Button>
          <Button variant={tab === 'logs' ? 'default' : 'outline'} className={tab === 'logs' ? '' : 'bg-transparent'} onClick={() => selectTab('logs')}>
            Logs de erro
          </Button>
        </div>

        {tab === 'falhas' ? <FailuresTab onUnauthorized={goToLogin} /> : <LogsTab onUnauthorized={goToLogin} />}
      </main>
    </div>
  )
}

export default function ErrosPage() {
  return (
    <Suspense fallback={null}>
      <ErrosContent />
    </Suspense>
  )
}
