'use client'

import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, TrendingDown, BookOpen } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast, Toaster } from "sonner"

export default function ClientDashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<{ name: string } | null>(null)
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

  if (isLoading || !session) {
    return null
  }

  const stats = {
    planosAtivos: 2,
    ultimaAtualizacao: "15/01/2025",
    metaPeso: "75kg",
    receitasDisponiveis: 24,
  }

  const planosRecentes = [
    {
      id: 1,
      nome: "Plano de Emagrecimento - Janeiro",
      data: "01/01/2025",
      status: "Ativo",
    },
    {
      id: 2,
      nome: "Plano de Manutenção - Dezembro",
      data: "01/12/2024",
      status: "Concluído",
    },
  ]

  const firstName = session.name?.split(' ')[0] || 'Cliente'

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <ClientNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Olá, {firstName}! 👋</h1>
          <p className="mt-2 text-muted-foreground">Acompanhe seu progresso e acesse seus planos alimentares</p>
        </div>

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
              <CardTitle className="text-sm font-medium">Meta de Peso</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.metaPeso}</div>
              <p className="text-xs text-muted-foreground">Objetivo definido</p>
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

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Meus Planos Recentes</CardTitle>
              <CardDescription>Acesse e visualize seus planos alimentares</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {planosRecentes.map((plano) => (
                  <div
                    key={plano.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{plano.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Criado em {plano.data} • {plano.status}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
