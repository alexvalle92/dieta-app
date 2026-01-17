'use client'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, FileText, CreditCard, RefreshCw } from "lucide-react"
import Link from "next/link"

interface MealPlanForAlert {
  id: string
  endDate: string | null
  dueDateNewMealPlan: string | null
  payment_url_new_meal_plan: string | null
  status: string
}

interface PlanExpirationAlertProps {
  plans: MealPlanForAlert[]
  variant: 'list' | 'detail'
  planPrice?: number
}

function calculateDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const targetDate = new Date(dateStr + 'T00:00:00')
  
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

function isExpired(endDate: string | null): boolean {
  const days = calculateDaysRemaining(endDate)
  return days !== null && days < 0
}

function getMostRecentPlan(plans: MealPlanForAlert[]): MealPlanForAlert | null {
  if (plans.length === 0) return null
  
  return plans.reduce((mostRecent, plan) => {
    if (!mostRecent.endDate) return plan
    if (!plan.endDate) return mostRecent
    // Comparar datas garantindo que sejam tratadas sem fuso horário UTC
    const datePlan = new Date(plan.endDate + 'T00:00:00')
    const dateMostRecent = new Date(mostRecent.endDate + 'T00:00:00')
    return datePlan > dateMostRecent ? plan : mostRecent
  })
}

// Verifica se existe algum plano que NÃO SEJA o mais recente e que não esteja expirado
function hasOtherNonExpiredPlan(plans: MealPlanForAlert[], mostRecentId: string): boolean {
  return plans.some(plan => plan.id !== mostRecentId && !isExpired(plan.endDate))
}

type ExpirationStatus = 'ok' | 'd5' | 'd2' | 'd0' | 'expired'

function getExpirationStatus(daysRemaining: number | null): ExpirationStatus {
  if (daysRemaining === null) return 'ok'
  
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining === 0) return 'd0'
  if (daysRemaining <= 2) return 'd2'
  if (daysRemaining <= 5) return 'd5'
  
  return 'ok'
}

export function PlanExpirationAlert({ plans, variant, planPrice = 97 }: PlanExpirationAlertProps) {
  if (plans.length === 0) return null
  
  const plan = getMostRecentPlan(plans)
  if (!plan) return null

  // Se existir OUTRO plano ativo que não seja o que está prestes a vencer, não mostramos alerta
  if (hasOtherNonExpiredPlan(plans, plan.id)) return null
  
  const daysRemaining = calculateDaysRemaining(plan.endDate)
  const status = getExpirationStatus(daysRemaining)
  
  if (status === 'ok') return null
  
  const hasDueDate = plan.dueDateNewMealPlan !== null
  const dueDateDaysRemaining = calculateDaysRemaining(plan.dueDateNewMealPlan)
  const isDueDateExpired = dueDateDaysRemaining !== null && dueDateDaysRemaining < 0
  const isDueDateValid = dueDateDaysRemaining !== null && dueDateDaysRemaining >= 0
  
  // Na listagem, apenas D-0 e Expired são mostrados
  if (variant === 'list') {
    if (status === 'd0') {
      if (hasDueDate && isDueDateValid) {
        return (
          <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50 text-orange-900">
            <Clock className="h-4 w-4" />
            <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
            <AlertDescription className="mt-2">
              <p>Você já preencheu o formulário. Efetue o pagamento para liberar seu novo plano ou atualize seus dados se necessário.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={plan.payment_url_new_meal_plan || `/cliente/planos/${plan.id}/pagamento`} target={plan.payment_url_new_meal_plan ? "_blank" : "_self"}>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
                <Link href={`/cliente/planos/${plan.id}/renovar`}>
                  <Button size="sm" variant="outline" className="gap-2 border-orange-500 text-orange-700 hover:bg-orange-100">
                    <RefreshCw className="h-4 w-4" />
                    Atualizar Dados
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )
      }
      
      return (
        <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50 text-orange-900">
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Seu plano alimentar vence hoje. Para receber um novo plano atualizado, é só preencher o formulário de atualização.</p>
            <Link href={`/cliente/planos/${plan.id}/renovar`}>
              <Button size="sm" className="mt-3 gap-2 bg-orange-600 hover:bg-orange-700">
                <FileText className="h-4 w-4" />
                Preencher Formulário
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )
    }
    
    if (status === 'expired') {
      if (hasDueDate && isDueDateValid) {
        return (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
            <AlertDescription className="mt-2">
              <p>Você já preencheu o formulário. Efetue o pagamento para liberar seu novo plano ou atualize seus dados se necessário.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={plan.payment_url_new_meal_plan || `/cliente/planos/${plan.id}/pagamento`} target={plan.payment_url_new_meal_plan ? "_blank" : "_self"}>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
                <Link href={`/cliente/planos/${plan.id}/renovar`}>
                  <Button size="sm" variant="outline" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Atualizar Dados
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )
      }
      
      if (hasDueDate && isDueDateExpired) {
        return (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
            <AlertDescription className="mt-2">
              <p>O prazo para pagamento expirou. Preencha o formulário novamente para renovar seu plano.</p>
              <Link href={`/cliente/planos/${plan.id}/renovar`}>
                <Button size="sm" className="mt-3 gap-2">
                  <FileText className="h-4 w-4" />
                  Preencher Formulário Novamente
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )
      }
      
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Seu plano alimentar expirou. Para liberar um novo plano atualizado, é só atualizar seus dados e concluir o pagamento.</p>
            <Link href={`/cliente/planos/${plan.id}/renovar`}>
              <Button size="sm" className="mt-3 gap-2">
                <FileText className="h-4 w-4" />
                Preencher Formulário
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )
    }
  }
  
  if (variant === 'detail') {
    if (status === 'd5') {
      return (
        <Alert className="mb-6 border-blue-500 bg-blue-50 text-blue-900">
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-semibold">Seu plano está acabando</AlertTitle>
          <AlertDescription className="mt-2">
            <p>
              Faltam <strong>{daysRemaining} dias</strong> para o seu plano alimentar vencer.
            </p>
            <p className="mt-2">
              Em breve vamos liberar um formulário rápido de atualização para ajustar seu próximo plano.
            </p>
            <p className="mt-2 text-sm font-medium">
              Valor da renovação: R$ {planPrice.toFixed(2).replace('.', ',')}
            </p>
          </AlertDescription>
        </Alert>
      )
    }
    
    if (status === 'd2') {
      if (hasDueDate && isDueDateValid) {
        return (
          <Alert className="mb-6 border-yellow-500 bg-yellow-50 text-yellow-900">
            <Clock className="h-4 w-4" />
            <AlertTitle className="font-semibold">Faltam poucos dias!</AlertTitle>
            <AlertDescription className="mt-2">
              <p>
                Faltam <strong>{daysRemaining} dias</strong> para o seu plano alimentar vencer.
              </p>
              <p className="mt-2">
                Você já preencheu o formulário. Efetue o pagamento para liberar seu novo plano ou atualize seus dados se necessário.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/cliente/planos/${plan.id}/pagamento`}>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
                <Link href={`/cliente/planos/${plan.id}/renovar`}>
                  <Button size="sm" variant="outline" className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-100">
                    <RefreshCw className="h-4 w-4" />
                    Atualizar Dados
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )
      }
      
      return (
        <Alert className="mb-6 border-yellow-500 bg-yellow-50 text-yellow-900">
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-semibold">Faltam poucos dias!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>
              Faltam <strong>{daysRemaining} dias</strong> para o seu plano alimentar vencer.
            </p>
            <p className="mt-2">
              Já deixamos disponível o formulário de atualização (leva menos de 3 minutos). Após o preenchimento, iremos liberar seu novo plano facilmente.
            </p>
            <Link href={`/cliente/planos/${plan.id}/renovar`}>
              <Button size="sm" className="mt-3 gap-2 bg-yellow-600 hover:bg-yellow-700 text-white">
                <FileText className="h-4 w-4" />
                Preencher Formulário
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )
    }
    
    if (status === 'd0') {
      if (hasDueDate && isDueDateValid) {
        return (
          <Alert variant="destructive" className="mb-6 border-orange-500 bg-orange-50 text-orange-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
            <AlertDescription className="mt-2">
              <p>Você já preencheu o formulário. Efetue o pagamento para liberar seu novo plano ou atualize seus dados se necessário.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={plan.payment_url_new_meal_plan || `/cliente/planos/${plan.id}/pagamento`} target={plan.payment_url_new_meal_plan ? "_blank" : "_self"}>
                  <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
                <Link href={`/cliente/planos/${plan.id}/renovar`}>
                  <Button size="sm" variant="outline" className="gap-2 border-orange-500 text-orange-700 hover:bg-orange-100">
                    <RefreshCw className="h-4 w-4" />
                    Atualizar Dados
                  </Button>
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        )
      }
      
      return (
        <Alert variant="destructive" className="mb-6 border-orange-500 bg-orange-50 text-orange-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Seu plano alimentar vence hoje. Para receber um novo plano atualizado, é só preencher o formulário de atualização.</p>
            <Link href={`/cliente/planos/${plan.id}/renovar`}>
              <Button size="sm" className="mt-3 gap-2 bg-orange-600 hover:bg-orange-700">
                <FileText className="h-4 w-4" />
                Preencher Formulário
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )
    }

    // No detalhe também mostramos o alerta de expirado caso o usuário acesse um plano antigo
    if (status === 'expired') {
        return (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
            <AlertDescription className="mt-2">
              <p>Seu plano alimentar expirou. Para liberar um novo plano atualizado, é só atualizar seus dados e concluir o pagamento.</p>
              <Link href={`/cliente/planos/${plan.id}/renovar`}>
                <Button size="sm" className="mt-3 gap-2">
                  <FileText className="h-4 w-4" />
                  Preencher Formulário
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )
    }
  }
  
  return null
}

export function PlanExpirationBadge({ plans }: { plans: MealPlanForAlert[] }) {
  if (plans.length === 0) return null
  
  const plan = getMostRecentPlan(plans)
  if (!plan) return null
  
  // No badge se houver outro plano ativo
  if (hasOtherNonExpiredPlan(plans, plan.id)) return null
  
  const daysRemaining = calculateDaysRemaining(plan.endDate)
  const status = getExpirationStatus(daysRemaining)
  
  if (status === 'ok' || status === 'd5') return null
  
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Expirado
      </span>
    )
  }
  
  if (status === 'd0') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
        <Clock className="h-3 w-3" />
        Vence hoje
      </span>
    )
  }
  
  if (status === 'd2') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        <Clock className="h-3 w-3" />
        Vence em {daysRemaining} dias
      </span>
    )
  }
  
  return null
}
