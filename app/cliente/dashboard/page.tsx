'use client'

import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, BookOpen, Loader2, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast, Toaster } from "sonner"

interface DashboardStats {
  planosAtivos: number
  totalPlanos: number
  ultimaAtualizacao: string
  receitasDisponiveis: number
}

interface RecentPlan {
  id: string
  status: string
  created_at: string
}

export default function ClientDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<{ name: string } | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          router.push('/cliente/login')
          return
        }
        const data = await response.json()
        setSession(data.user)
      } catch (error) {
        router.push('/cliente/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (searchParams.get('login') === 'success') {
      const userName = searchParams.get('name') || 'Cliente'
      toast.success(`Bem-vindo, ${userName}!`)
      
      window.history.replaceState({}, '', '/cliente/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/client/dashboard-stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
          setRecentPlans(data.recentPlans)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      }
    }

    if (session) {
      fetchDashboardData()
    }
  }, [session])

  if (isLoading || !session) {
    return null
  }

  const firstName = session.name?.split(' ')[0] || 'Cliente'

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'active': 'Ativo',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'text-green-600',
      'completed': 'text-blue-600',
      'cancelled': 'text-gray-600'
    }
    return colors[status] || 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <ClientNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Olá, {firstName}! 👋</h1>
          <p className="mt-2 text-muted-foreground">Acompanhe seu progresso e acesse seus planos alimentares</p>
        </div>

        {!stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.planosAtivos}</div>
                  <p className="text-xs text-muted-foreground">Planos em andamento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Planos</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.totalPlanos}</div>
                  <p className="text-xs text-muted-foreground">Planos cadastrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.ultimaAtualizacao}</div>
                  <p className="text-xs text-muted-foreground">Último plano cadastrado</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.receitasDisponiveis}</div>
                  <p className="text-xs text-muted-foreground">Receitas disponíveis</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Planos Recentes</CardTitle>
                  <CardDescription>Últimos planos alimentares cadastrados</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentPlans.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">Você ainda não possui planos alimentares</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Entre em contato com seu nutricionista
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {recentPlans.map((plano) => (
                          <div
                            key={plano.id}
                            className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                <FileText className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">Plano Alimentar</h3>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(plano.created_at).toLocaleDateString('pt-BR')} • <span className={getStatusColor(plano.status)}>{getStatusLabel(plano.status)}</span>
                                </p>
                              </div>
                            </div>
                            <Link href={`/cliente/planos/${plano.id}`}>
                              <Button>Ver Plano</Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                      <div className="mt-6">
                        <Link href="/cliente/planos">
                          <Button variant="outline" className="w-full bg-transparent">
                            Ver Todos os Planos
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Acesso Rápido</CardTitle>
                  <CardDescription>Navegue pelas principais seções</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/cliente/planos">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <FileText className="h-5 w-5" />
                        Meus Planos Alimentares
                      </Button>
                    </Link>
                    <Link href="/cliente/receitas">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <BookOpen className="h-5 w-5" />
                        Receitas Saudáveis
                      </Button>
                    </Link>
                    <Link href="/cliente/meus-dados">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <Calendar className="h-5 w-5" />
                        Meus Dados
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
