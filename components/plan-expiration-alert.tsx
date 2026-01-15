'use client'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, FileText, CreditCard } from "lucide-react"
import Link from "next/link"

interface PlanExpirationAlertProps {
  endDate: string | null
  planId: string
  variant: 'list' | 'detail'
  planPrice?: number
}

type ExpirationStatus = 'ok' | 'd5' | 'd2' | 'd0' | 'expired'

function calculateDaysRemaining(endDate: string | null): number | null {
  if (!endDate) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  const diffTime = end.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

function getExpirationStatus(daysRemaining: number | null): ExpirationStatus {
  if (daysRemaining === null) return 'ok'
  
  if (daysRemaining < 0) return 'expired'
  if (daysRemaining === 0) return 'd0'
  if (daysRemaining <= 2) return 'd2'
  if (daysRemaining <= 5) return 'd5'
  
  return 'ok'
}

export function PlanExpirationAlert({ endDate, planId, variant, planPrice = 97 }: PlanExpirationAlertProps) {
  const daysRemaining = calculateDaysRemaining(endDate)
  const status = getExpirationStatus(daysRemaining)
  
  if (status === 'ok') return null
  
  if (variant === 'list') {
    if (status === 'd0') {
      return (
        <Alert variant="destructive" className="mb-4 border-orange-500 bg-orange-50 text-orange-900">
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Seu plano alimentar vence hoje. Para receber um novo plano atualizado, é só preencher o formulário de atualização.</p>
            <Link href={`/cliente/planos/${planId}/renovar`}>
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
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Seu plano alimentar expirou. Para liberar um novo plano atualizado, é só atualizar seus dados e concluir o pagamento.</p>
            <Link href={`/cliente/planos/${planId}/renovar`}>
              <Button size="sm" className="mt-3 gap-2">
                <CreditCard className="h-4 w-4" />
                Renovar Plano
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
            <Link href={`/cliente/planos/${planId}/renovar`}>
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
      return (
        <Alert variant="destructive" className="mb-6 border-orange-500 bg-orange-50 text-orange-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Seu plano alimentar vence hoje. Para receber um novo plano atualizado, é só preencher o formulário de atualização.</p>
            <Link href={`/cliente/planos/${planId}/renovar`}>
              <Button size="sm" className="mt-3 gap-2 bg-orange-600 hover:bg-orange-700">
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

export function PlanExpirationBadge({ endDate }: { endDate: string | null }) {
  const daysRemaining = calculateDaysRemaining(endDate)
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
