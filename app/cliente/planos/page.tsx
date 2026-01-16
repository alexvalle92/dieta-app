'use client'

import { useState, useEffect } from 'react'
import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PlanExpirationAlert, PlanExpirationBadge } from "@/components/plan-expiration-alert"

interface MealPlan {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  dueDateNewMealPlan: string | null
  status: 'active' | 'completed' | 'cancelled'
  planData: {
    calories?: number
    meals?: any[]
    observations?: string
  }
  createdAt: string
}

export default function ClientPlanosPage() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMealPlans()
  }, [])

  const fetchMealPlans = async () => {
    try {
      const response = await fetch('/api/client/meal-plans')
      const data = await response.json()

      if (response.ok) {
        setMealPlans(data.mealPlans || [])
      } else {
        console.error('Error fetching meal plans:', data.error)
      }
    } catch (error) {
      console.error('Error fetching meal plans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'completed':
        return 'Concluído'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'active':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00')
      return format(date, "dd/MM/yyyy", { locale: ptBR })
    } catch (error) {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meus Planos Alimentares</h1>
          <p className="mt-2 text-muted-foreground">Visualize e acompanhe todos os seus planos alimentares</p>
        </div>

        {mealPlans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum plano alimentar encontrado</h3>
              <p className="text-muted-foreground text-center">
                Seu nutricionista ainda não criou nenhum plano alimentar para você.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <PlanExpirationAlert 
              plans={mealPlans.map(p => ({ 
                id: p.id, 
                endDate: p.endDate, 
                dueDateNewMealPlan: p.dueDateNewMealPlan, 
                status: p.status 
              }))} 
              variant="list" 
            />
            {mealPlans.map((plano) => (
              <div key={plano.id}>
                <Card className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{plano.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlanExpirationBadge plans={[{ 
                        id: plano.id, 
                        endDate: plano.endDate, 
                        dueDateNewMealPlan: plano.dueDateNewMealPlan, 
                        status: plano.status 
                      }]} />
                      <Badge variant={getStatusVariant(plano.status)}>
                        {getStatusLabel(plano.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Início: {formatDate(plano.startDate)}</span>
                    </div>
                    {plano.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Fim: {formatDate(plano.endDate)}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href={plano.status === 'active' ? `/cliente/planos/${plano.id}` : '#'}>
                      <Button 
                        className="w-full sm:w-auto" 
                        disabled={plano.status !== 'active'}
                      >
                        {plano.status === 'active' ? 'Ver Detalhes do Plano' : 'Plano Inativo'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
