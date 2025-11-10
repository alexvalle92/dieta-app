'use client'

import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, BookOpen, TrendingUp } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast, Toaster } from "sonner"

export default function AdminDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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

  if (isLoading) {
    return null
  }

  const stats = {
    totalPacientes: 48,
    planosAtivos: 32,
    receitasCadastradas: 24,
    novosEsseMes: 12,
  }

  const atividadesRecentes = [
    {
      tipo: "paciente",
      descricao: "Novo paciente cadastrado: Maria Silva",
      data: "Há 2 horas",
    },
    {
      tipo: "plano",
      descricao: "Plano atualizado para João Santos",
      data: "Há 5 horas",
    },
    {
      tipo: "receita",
      descricao: "Nova receita adicionada: Salada de Quinoa",
      data: "Há 1 dia",
    },
    {
      tipo: "paciente",
      descricao: "Senha redefinida para Ana Costa",
      data: "Há 2 dias",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
          <p className="mt-2 text-muted-foreground">Visão geral da plataforma e atividades recentes</p>
        </div>

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
              <div className="text-2xl font-bold text-primary">+25%</div>
              <p className="text-xs text-muted-foreground">Comparado ao mês anterior</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Atividades Recentes</CardTitle>
              <CardDescription>Últimas ações realizadas na plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {atividadesRecentes.map((atividade, index) => (
                  <div key={index} className="flex items-start gap-4 rounded-lg border border-border p-4">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                        atividade.tipo === "paciente"
                          ? "bg-primary/10"
                          : atividade.tipo === "plano"
                            ? "bg-secondary/10"
                            : "bg-accent/10"
                      }`}
                    >
                      {atividade.tipo === "paciente" && <Users className="h-5 w-5 text-primary" />}
                      {atividade.tipo === "plano" && <FileText className="h-5 w-5 text-secondary" />}
                      {atividade.tipo === "receita" && <BookOpen className="h-5 w-5 text-accent" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{atividade.descricao}</p>
                      <p className="text-xs text-muted-foreground">{atividade.data}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
