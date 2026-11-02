"use client"

import { useEffect, useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { ClientShell } from "@/components/client-shell"
import { MealPlanView, type ClientMealPlan } from "@/components/meal-plan-view"
import { PlanExpirationAlert } from "@/components/plan-expiration-alert"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type LoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; plans: ClientMealPlan[] }

/** Aba "Meu Plano": abre direto o plano ativo do paciente (há no máximo um). */
export default function MeuPlanoPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" })

  const fetchPlans = async () => {
    setState({ kind: "loading" })
    try {
      const response = await fetch("/api/client/meal-plans")
      if (!response.ok) {
        setState({ kind: "error" })
        return
      }
      const data = await response.json()
      setState({ kind: "ready", plans: data.mealPlans || [] })
    } catch {
      setState({ kind: "error" })
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const activePlan = state.kind === "ready" ? state.plans.find((p) => p.status === "active") : undefined

  return (
    <ClientShell>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {state.kind === "loading" && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.kind === "error" && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-center text-muted-foreground">Não foi possível carregar seu plano.</p>
              <Button onClick={fetchPlans}>Tentar de novo</Button>
            </CardContent>
          </Card>
        )}

        {state.kind === "ready" && activePlan && <MealPlanView plan={activePlan} />}

        {state.kind === "ready" && !activePlan && (
          <>
            <Card className="mb-6">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <h2 className="text-lg font-semibold">Você ainda não tem um plano ativo</h2>
              </CardContent>
            </Card>
            {state.plans.length > 0 && (
              <PlanExpirationAlert
                plans={state.plans.map((p) => ({
                  id: p.id,
                  endDate: p.endDate,
                  renewalStatus: p.renewalStatus,
                  paymentUrlNewMealPlan: p.paymentUrlNewMealPlan,
                  status: p.status,
                }))}
                variant="list"
              />
            )}
          </>
        )}
      </main>
    </ClientShell>
  )
}
