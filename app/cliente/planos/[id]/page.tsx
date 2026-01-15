'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Download, Loader2 } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { PlanExpirationAlert } from "@/components/plan-expiration-alert"

interface MealPlan {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  status: 'active' | 'completed' | 'cancelled'
  planData: {
    calories?: number
    meals?: Array<{
      name: string
      time: string
      calories: string
      foods: string
    }>
    observations?: string
  }
  createdAt: string
}

export default function PlanoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMealPlan()
  }, [id])

  const fetchMealPlan = async () => {
    try {
      const response = await fetch(`/api/client/meal-plans/${id}`)
      const data = await response.json()

      if (response.ok) {
        setMealPlan(data.mealPlan)
      } else {
        console.error('Error fetching meal plan:', data.error)
        router.push('/cliente/planos')
      }
    } catch (error) {
      console.error('Error fetching meal plan:', error)
      router.push('/cliente/planos')
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
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch (error) {
      return dateString
    }
  }

  const handleDownloadPDF = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Plano não encontrado</h2>
            <Link href="/cliente/planos">
              <Button variant="outline" className="mt-4">
                Voltar para Meus Planos
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  const meals = mealPlan.planData?.meals || []
  const observations = mealPlan.planData?.observations || ''

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 no-print">
          <Link href="/cliente/planos">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Planos
            </Button>
          </Link>
        </div>

        <PlanExpirationAlert 
          endDate={mealPlan.endDate} 
          planId={mealPlan.id} 
          variant="detail" 
        />

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl">{mealPlan.title}</CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Início: {formatDate(mealPlan.startDate)}</span>
                    </div>
                    {mealPlan.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Fim: {formatDate(mealPlan.endDate)}</span>
                      </div>
                    )}
                    
                  </div>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={getStatusVariant(mealPlan.status)}>
                  {getStatusLabel(mealPlan.status)}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {meals.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">Refeições Diárias</h2>
            {meals.map((meal, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{meal.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                {meal.foods && (
                  <CardContent>
                    <ul className="space-y-2">
                      {meal.foods.split('\n').filter(food => food.trim()).map((alimento, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                          <span>{alimento.trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {observations && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Observações Importantes</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {observations.split('\n').filter(obs => obs.trim()).map((obs, index) => (
                  <li key={index} className="flex items-start gap-2 text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                    <span>{obs.trim()}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex gap-4 no-print">
          <Button 
            className="flex-1 gap-2 bg-transparent" 
            variant="outline"
            onClick={handleDownloadPDF}
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </main>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  )
}
