'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientShell } from "@/components/client-shell"
import { MealPlanView, type ClientMealPlan } from "@/components/meal-plan-view"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Link from "next/link"

export default function PlanoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [mealPlan, setMealPlan] = useState<ClientMealPlan | null>(null)
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

  if (isLoading) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </ClientShell>
    )
  }

  if (!mealPlan) {
    return (
      <ClientShell>
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Plano não encontrado</h2>
            <Link href="/cliente/dashboard">
              <Button variant="outline" className="mt-4">
                Voltar para o Início
              </Button>
            </Link>
          </div>
        </main>
      </ClientShell>
    )
  }

  return (
    <ClientShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <MealPlanView plan={mealPlan} backHref="/cliente/dashboard" />
      </main>
    </ClientShell>
  )
}
