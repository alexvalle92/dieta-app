'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { AdminNav } from '@/components/admin-nav'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { channelLabel, formatAnswer, notificationKindLabel, planOriginLabel } from '@/lib/admin/record-format'

// Datas chegam como texto ISO (JSON). Este tipo é o de `PatientRecord` depois da serialização.
interface PatientRecordView {
  patient: {
    id: string
    name: string
    cpf: string
    email: string
    phone: string
    createdAt: string
    hasPassword: boolean
    mustChangePassword: boolean
  }
  quizResponses: { id: string; createdAt: string; answers: Record<string, unknown> }[]
  payments: {
    id: string
    amount: string
    status: string
    dueDate: string | null
    paidAt: string | null
    billingType: string | null
    paymentUrl: string | null
    createdAt: string
  }[]
  mealPlans: {
    id: string
    title: string
    startDate: string
    endDate: string | null
    status: string
    origin: 'ai' | 'admin'
    createdAt: string
  }[]
  notifications: {
    id: string
    channel: string
    kind: string
    status: string
    attempts: number
    sentAt: string | null
    createdAt: string
  }[]
}

const PLAN_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviada',
  failed: 'Falhou',
}

const formatCPF = (cpf: string) => {
  const numbers = cpf.replace(/\D/g, '')
  return numbers.length === 11 ? numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf
}

const formatPhone = (phone: string) => {
  if (!phone) return 'Não informado'
  const numbers = phone.replace(/\D/g, '')
  if (numbers.length === 11) return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (numbers.length === 10) return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return phone
}

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

/** "2026-10-12" → "12/10/2026", sem passar por fuso horário. */
const formatDay = (value: string | null) => {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

const formatMoney = (amount: string) =>
  Number(amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const prettyKey = (key: string) => {
  const spaced = key.replace(/_/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Nenhum registro.</p>
}

export default function PacienteCadastroPage() {
  const params = useParams<{ id: string }>()
  const [record, setRecord] = useState<PatientRecordView | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/patients/${params.id}/record`)
        const data = await response.json()
        if (response.ok) {
          setRecord(data.record)
        } else {
          toast.error(data.error || 'Erro ao carregar o cadastro')
        }
      } catch {
        toast.error('Erro ao carregar o cadastro')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [params.id])

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin/pacientes">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Pacientes
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !record ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Paciente não encontrado.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{record.patient.name}</CardTitle>
                <CardDescription>Dados do cadastro</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">CPF</dt>
                    <dd className="font-medium text-foreground">{formatCPF(record.patient.cpf)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">E-mail</dt>
                    <dd className="font-medium text-foreground">{record.patient.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Telefone</dt>
                    <dd className="font-medium text-foreground">{formatPhone(record.patient.phone)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cadastrado em</dt>
                    <dd className="font-medium text-foreground">{formatDateTime(record.patient.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Acesso ao PlanA</dt>
                    <dd>
                      <Badge variant={record.patient.hasPassword ? 'default' : 'secondary'}>
                        {record.patient.hasPassword ? 'Tem senha' : 'Sem senha (ainda não pagou)'}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Troca de senha</dt>
                    <dd>
                      <Badge variant="outline">
                        {record.patient.mustChangePassword ? 'Pendente no próximo acesso' : 'Não exigida'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Respostas do quiz</CardTitle>
                <CardDescription>Cada envio do formulário, do mais novo ao mais antigo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {record.quizResponses.length === 0 ? (
                  <Empty />
                ) : (
                  record.quizResponses.map((quiz) => (
                    <div key={quiz.id} className="rounded-lg border border-border p-4">
                      <p className="mb-3 text-sm font-semibold text-foreground">
                        Enviado em {formatDateTime(quiz.createdAt)}
                      </p>
                      <dl className="grid gap-3 text-sm sm:grid-cols-2">
                        {Object.entries(quiz.answers)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-muted-foreground">{prettyKey(key)}</dt>
                              <dd className="break-words font-medium text-foreground">{formatAnswer(value)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cobranças</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {record.payments.length === 0 ? (
                  <Empty />
                ) : (
                  record.payments.map((payment) => (
                    <div key={payment.id} className="flex flex-col gap-2 rounded-lg border border-border p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-foreground">{formatMoney(payment.amount)}</span>
                        <Badge variant="outline">{payment.status}</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <span className="text-muted-foreground">Vencimento: {formatDay(payment.dueDate)}</span>
                        <span className="text-muted-foreground">Pago em: {formatDateTime(payment.paidAt)}</span>
                        <span className="text-muted-foreground">Forma: {payment.billingType ?? '—'}</span>
                      </div>
                      {payment.paymentUrl && payment.paymentUrl.startsWith('https://') && (
                        <a
                          href={payment.paymentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Abrir link da cobrança
                        </a>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Planos alimentares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {record.mealPlans.length === 0 ? (
                  <Empty />
                ) : (
                  record.mealPlans.map((plan) => (
                    <div key={plan.id} className="flex flex-col gap-1 rounded-lg border border-border p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{plan.title}</span>
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                          {PLAN_STATUS_LABELS[plan.status] ?? plan.status}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {formatDay(plan.startDate)} a {formatDay(plan.endDate)} • {planOriginLabel(plan.origin)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagens</CardTitle>
                <CardDescription>E-mails e WhatsApps enviados ao paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {record.notifications.length === 0 ? (
                  <Empty />
                ) : (
                  record.notifications.map((n) => (
                    <div
                      key={n.id}
                      className="flex flex-col gap-1 rounded-lg border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-foreground">
                        {notificationKindLabel(n.kind)} • {channelLabel(n.channel)}
                      </span>
                      <span className="text-muted-foreground">
                        {NOTIFICATION_STATUS_LABELS[n.status] ?? n.status} • {n.attempts} tentativa(s) •{' '}
                        {n.sentAt ? `enviada em ${formatDateTime(n.sentAt)}` : `criada em ${formatDateTime(n.createdAt)}`}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
