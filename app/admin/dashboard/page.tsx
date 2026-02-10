'use client'
export const dynamic = 'force-dynamic'
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, FileText, BookOpen, TrendingUp, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast, Toaster } from "sonner"

interface DashboardStats {
  totalPacientes: number
  planosAtivos: number
  receitasCadastradas: number
  novosEsseMes: number
  crescimento: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        if (!response.ok) {
          router.push('/admin/login')
          return
        }
        const data = await response.json()
        if (data.user?.userType !== 'admin') {
          router.push('/admin/login')
          return
        }
      } catch (error) {
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkSession()
  }, [router])

  useEffect(() => {
    if (searchParams.get('login') === 'success') {
      const userName = searchParams.get('name') || 'Admin'
      toast.success(`Bem-vindo, ${userName}!`)
      
      window.history.replaceState({}, '', '/admin/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard-stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      }
    }

    if (!isLoading) {
      fetchDashboardData()
    }
  }, [isLoading])

  if (isLoading) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="mt-2 text-muted-foreground">Visão geral da plataforma e estatísticas</p>
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
                  <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.totalPacientes}</div>
                  <p className="text-xs text-muted-foreground">+{stats.novosEsseMes} novos este mês</p>
                </CardContent>
              </Card>

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
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{stats.receitasCadastradas}</div>
                  <p className="text-xs text-muted-foreground">Receitas cadastradas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats.crescimento > 0 ? '+' : ''}{stats.crescimento}%
                  </div>
                  <p className="text-xs text-muted-foreground">Comparado ao mês anterior</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                  <CardDescription>Acesse as principais funcionalidades</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/admin/pacientes/novo">
                      <Button className="w-full justify-start gap-3">
                        <Plus className="h-5 w-5" />
                        Cadastrar Novo Paciente
                      </Button>
                    </Link>
                    <Link href="/admin/planos/novo">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <Plus className="h-5 w-5" />
                        Criar Plano Alimentar
                      </Button>
                    </Link>
                    <Link href="/admin/receitas/nova">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <Plus className="h-5 w-5" />
                        Adicionar Receita
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Navegação Rápida</CardTitle>
                  <CardDescription>Acesse as seções principais</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Link href="/admin/pacientes">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <Users className="h-5 w-5" />
                        Gerenciar Pacientes
                      </Button>
                    </Link>
                    <Link href="/admin/planos">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <FileText className="h-5 w-5" />
                        Planos Alimentares
                      </Button>
                    </Link>
                    <Link href="/admin/receitas">
                      <Button variant="outline" className="w-full justify-start gap-3 bg-transparent">
                        <BookOpen className="h-5 w-5" />
                        Biblioteca de Receitas
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Resumo da Plataforma</CardTitle>
                  <CardDescription>Informações importantes sobre o sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.totalPacientes}</p>
                          <p className="text-xs text-muted-foreground">Pacientes</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                          <FileText className="h-5 w-5 text-secondary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.planosAtivos}</p>
                          <p className="text-xs text-muted-foreground">Planos Ativos</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                          <BookOpen className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.receitasCadastradas}</p>
                          <p className="text-xs text-muted-foreground">Receitas</p>
                        </div>
                      </div>
                    </div>
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
