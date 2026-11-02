"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Calendar, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlanExpirationAlert } from "@/components/plan-expiration-alert"
import { mealOptions, type MealOption } from "@/lib/meal-plan/options"
import type { RenewalStatus } from "@/lib/renewal/rules"

export type ClientMealPlan = {
  id: string
  title: string
  description: string | null
  startDate: string
  endDate: string | null
  dueDateNewMealPlan: string | null
  paymentUrlNewMealPlan: string | null
  renewalStatus: RenewalStatus
  status: "active" | "completed" | "cancelled"
  planData: {
    calories?: number
    meals?: unknown
    observations?: string
  }
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = { active: "Ativo", completed: "Concluído", cancelled: "Cancelado" }
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
}

function formatDate(dateString: string) {
  try {
    // T00:00:00 para a data ser lida como local, não UTC
    return format(new Date(dateString + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
  } catch {
    return dateString
  }
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

function FoodList({ foods }: { foods: string[] }) {
  if (foods.length === 0) return null
  return (
    <ul className="space-y-2">
      {foods.map((food, idx) => (
        <li key={idx} className="flex items-start gap-2 text-foreground">
          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
          <span>{food}</span>
        </li>
      ))}
    </ul>
  )
}

function Kcal({ calories }: { calories: string | null }) {
  if (!calories) return null
  return <p className="mt-3 text-right text-sm text-muted-foreground">~{calories} kcal</p>
}

/** Card da refeição: com substituta, botões "Opção N" trocam a opção visível; na impressão saem todas. */
function MealCard({ name, time, options }: { name: string; time: string; options: MealOption[] }) {
  const [selected, setSelected] = useState(0)
  const hasChoice = options.length > 1
  const visible = options[selected] ?? options[0]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {name}
          {time && <span className="font-normal text-muted-foreground"> · {time}</span>}
        </CardTitle>
        {hasChoice && (
          <div role="tablist" aria-label={`Opções de ${name}`} className="mt-3 inline-flex rounded-lg bg-muted p-1 print:hidden">
            {options.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={selected === i}
                onClick={() => setSelected(i)}
                className={`min-h-9 flex-1 rounded-md px-4 text-sm font-medium transition-colors ${
                  selected === i ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Opção {i + 1}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="print:hidden">
          <FoodList foods={visible.foods} />
          <Kcal calories={visible.calories} />
        </div>
        <div className="hidden space-y-4 print:block">
          {options.map((option, i) => (
            <div key={i}>
              {hasChoice && <p className="mb-2 font-semibold">Opção {i + 1}</p>}
              <FoodList foods={option.foods} />
              <Kcal calories={option.calories} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/** Plano alimentar do paciente: usado por `/cliente/meu-plano` e `/cliente/planos/[id]`. */
export function MealPlanView({ plan, backHref }: { plan: ClientMealPlan; backHref?: string }) {
  const rawMeals = Array.isArray(plan.planData?.meals) ? (plan.planData.meals as unknown[]) : []
  const meals = rawMeals
    .map((meal) => {
      const fields = typeof meal === "object" && meal !== null ? (meal as Record<string, unknown>) : {}
      return { name: text(fields.name), time: text(fields.time), options: mealOptions(meal) }
    })
    .filter((meal) => meal.options.length > 0)
  const observations = plan.planData?.observations || ""

  return (
    <>
      {backHref && (
        <div className="mb-6 no-print">
          <Link href={backHref}>
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      )}

      <PlanExpirationAlert
        plans={[
          {
            id: plan.id,
            endDate: plan.endDate,
            renewalStatus: plan.renewalStatus,
            paymentUrlNewMealPlan: plan.paymentUrlNewMealPlan,
            status: plan.status,
          },
        ]}
        variant="detail"
      />

      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{plan.title}</CardTitle>
              <CardDescription className="mt-2">
                <span className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Início: {formatDate(plan.startDate)}</span>
                  </span>
                  {plan.endDate && (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Fim: {formatDate(plan.endDate)}</span>
                    </span>
                  )}
                </span>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={STATUS_VARIANTS[plan.status] ?? "secondary"}>
                {STATUS_LABELS[plan.status] ?? plan.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {meals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Refeições Diárias</h2>
          {meals.map((meal, index) => (
            <MealCard key={index} name={meal.name} time={meal.time} options={meal.options} />
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
              {observations
                .split("\n")
                .filter((obs) => obs.trim())
                .map((obs, index) => (
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
        <Button className="flex-1 gap-2 bg-transparent" variant="outline" onClick={() => window.print()}>
          <Download className="h-4 w-4" />
          Baixar PDF
        </Button>
      </div>

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
    </>
  )
}
