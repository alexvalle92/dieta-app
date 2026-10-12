"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Clock,
  FileText,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { alertView } from "@/lib/renewal/alert-state";
import type { RenewalStatus } from "@/lib/renewal/rules";

interface MealPlanForAlert {
  id: string;
  endDate: string | null;
  status: string;
  renewalStatus: RenewalStatus;
  paymentUrlNewMealPlan: string | null;
}

interface PlanExpirationAlertProps {
  plans: MealPlanForAlert[];
  variant: "list" | "detail";
}

function calculateDaysRemaining(dateStr: string | null): number | null {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateStr + "T00:00:00");

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

function isExpired(endDate: string | null): boolean {
  const days = calculateDaysRemaining(endDate);
  return days !== null && days < 0;
}

function getMostRecentPlan(plans: MealPlanForAlert[]): MealPlanForAlert | null {
  if (plans.length === 0) return null;

  return plans.reduce((mostRecent, plan) => {
    if (!mostRecent.endDate) return plan;
    if (!plan.endDate) return mostRecent;
    // Comparar datas garantindo que sejam tratadas sem fuso horário UTC
    const datePlan = new Date(plan.endDate + "T00:00:00");
    const dateMostRecent = new Date(mostRecent.endDate + "T00:00:00");
    return datePlan > dateMostRecent ? plan : mostRecent;
  });
}

// Verifica se existe algum plano que NÃO SEJA o mais recente e que não esteja expirado
function hasOtherNonExpiredPlan(
  plans: MealPlanForAlert[],
  mostRecentId: string,
): boolean {
  return plans.some(
    (plan) => plan.id !== mostRecentId && !isExpired(plan.endDate),
  );
}

type ExpirationStatus = "ok" | "d5" | "d2" | "d0" | "expired";

function getExpirationStatus(daysRemaining: number | null): ExpirationStatus {
  if (daysRemaining === null) return "ok";

  if (daysRemaining < 0) return "expired";
  if (daysRemaining === 0) return "d0";
  if (daysRemaining <= 2) return "d2";
  if (daysRemaining <= 5) return "d5";

  return "ok";
}

export function PlanExpirationAlert({
  plans,
  variant,
}: PlanExpirationAlertProps) {
  if (plans.length === 0) return null;

  const plan = getMostRecentPlan(plans);
  if (!plan) return null;

  // Se existir OUTRO plano ativo que não seja o que está prestes a vencer, não mostramos alerta
  if (hasOtherNonExpiredPlan(plans, plan.id)) return null;

  const daysRemaining = calculateDaysRemaining(plan.endDate);

  // Qual alerta mostrar sai do estado da renovação (lib/renewal/alert-state.ts)
  const view = alertView({
    variant,
    daysLeft: daysRemaining,
    renewalStatus: plan.renewalStatus,
    paymentUrl: plan.paymentUrlNewMealPlan,
  });
  if (!view) return null;

  // Margem inferior: a listagem usa mb-4 e o detalhe mb-6
  const margin = variant === "list" ? "mb-4" : "mb-6";

  if (view.kind === "paid") {
    return (
      <Alert className={`${margin} border-blue-500 bg-blue-50 text-blue-900`}>
        <Clock className="h-4 w-4" />
        <AlertTitle className="font-semibold">Pagamento confirmado</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            Recebemos seu pagamento. Seu novo plano alimentar está sendo
            preparado e aparece aqui em alguns minutos.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (view.kind === "d5") {
    return (
      <Alert className={`${margin} border-blue-500 bg-blue-50 text-blue-900`}>
        <Clock className="h-4 w-4" />
        <AlertTitle className="font-semibold">
          Seu plano está acabando
        </AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            Faltam <strong>{daysRemaining} dias</strong> para o seu plano
            alimentar vencer.
          </p>
          <p className="mt-2">
            Em breve vamos liberar um formulário rápido de atualização para
            ajustar seu próximo plano.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (view.kind === "payment_expired") {
    return (
      <Alert variant="destructive" className={margin}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            O prazo para pagamento expirou. Preencha o formulário novamente
            para renovar seu plano.
          </p>
          <Link href={`/cliente/planos/${plan.id}/renovar`}>
            <Button size="sm" className="mt-3 gap-2">
              <FileText className="h-4 w-4" />
              Preencher Formulário Novamente
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (view.kind === "pay") {
    const paymentUrl = view.paymentUrl;
    const payParagraph = paymentUrl
      ? "Você já preencheu o formulário. Efetue o pagamento para liberar seu novo plano ou atualize seus dados se necessário."
      : "Você já preencheu o formulário. Seu link de pagamento está sendo gerado e chega por e-mail e WhatsApp em instantes.";

    if (view.stage === "d2") {
      return (
        <Alert className={`${margin} border-yellow-500 bg-yellow-50 text-yellow-900`}>
          <Clock className="h-4 w-4" />
          <AlertTitle className="font-semibold">Faltam poucos dias!</AlertTitle>
          <AlertDescription className="mt-2">
            <p>
              Faltam <strong>{daysRemaining} dias</strong> para o seu plano
              alimentar vencer.
            </p>
            <p className="mt-2">{payParagraph}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {paymentUrl && (
                <Link href={paymentUrl} target="_blank">
                  <Button
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
              )}
              <Link href={`/cliente/planos/${plan.id}/renovar`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Dados
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (view.stage === "d0") {
      return (
        <Alert
          variant="destructive"
          className={`${margin} border-orange-500 bg-orange-50 text-orange-900`}
        >
          {variant === "list" ? (
            <Clock className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle className="font-semibold">
            Seu plano vence hoje!
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p>{payParagraph}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {paymentUrl && (
                <Link href={paymentUrl} target="_blank">
                  <Button
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
              )}
              <Link href={`/cliente/planos/${plan.id}/renovar`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 border-orange-500 text-orange-700 hover:bg-orange-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Dados
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    // stage === "expired" (listagem e detalhe; a margem segue a variante)
    return (
      <Alert variant="destructive" className={margin}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{payParagraph}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {paymentUrl && (
              <Link href={paymentUrl} target="_blank">
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Efetuar Pagamento
                </Button>
              </Link>
            )}
            <Link href={`/cliente/planos/${plan.id}/renovar`}>
              <Button size="sm" variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Atualizar Dados
              </Button>
            </Link>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // view.kind === "form"
  if (view.stage === "d2") {
    return (
      <Alert className={`${margin} border-yellow-500 bg-yellow-50 text-yellow-900`}>
        <Clock className="h-4 w-4" />
        <AlertTitle className="font-semibold">Faltam poucos dias!</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            Faltam <strong>{daysRemaining} dias</strong> para o seu plano
            alimentar vencer.
          </p>
          <p className="mt-2">
            Já deixamos disponível o formulário de atualização (leva menos de 3
            minutos). Após o preenchimento, iremos liberar seu novo plano
            facilmente.
          </p>
          <Link href={`/cliente/planos/${plan.id}/renovar`}>
            <Button
              size="sm"
              className="mt-3 gap-2 bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <FileText className="h-4 w-4" />
              Preencher Formulário
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  if (view.stage === "d0") {
    return (
      <Alert
        variant="destructive"
        className={`${margin} border-orange-500 bg-orange-50 text-orange-900`}
      >
        {variant === "list" ? (
          <Clock className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle className="font-semibold">Seu plano vence hoje!</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            Seu plano alimentar vence hoje. Para receber um novo plano
            atualizado, é só preencher o formulário de atualização.
          </p>
          <Link href={`/cliente/planos/${plan.id}/renovar`}>
            <Button
              size="sm"
              className="mt-3 gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <FileText className="h-4 w-4" />
              Preencher Formulário
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // stage === "expired"
  return (
    <Alert variant="destructive" className={margin}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-semibold">Plano Expirado</AlertTitle>
      <AlertDescription className="mt-2">
        <p>
          Seu plano alimentar expirou. Para liberar um novo plano atualizado, é
          só atualizar seus dados e concluir o pagamento.
        </p>
        <Link href={`/cliente/planos/${plan.id}/renovar`}>
          <Button size="sm" className="mt-3 gap-2">
            <FileText className="h-4 w-4" />
            Preencher Formulário
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}

export function PlanExpirationBadge({ plans }: { plans: MealPlanForAlert[] }) {
  if (plans.length === 0) return null;

  const plan = getMostRecentPlan(plans);
  if (!plan) return null;

  // No badge se houver outro plano ativo
  if (hasOtherNonExpiredPlan(plans, plan.id)) return null;

  const daysRemaining = calculateDaysRemaining(plan.endDate);
  const status = getExpirationStatus(daysRemaining);

  if (status === "ok" || status === "d5") return null;

  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        <AlertTriangle className="h-3 w-3" />
        Expirado
      </span>
    );
  }

  if (status === "d0") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
        <Clock className="h-3 w-3" />
        Vence hoje
      </span>
    );
  }

  if (status === "d2") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
        <Clock className="h-3 w-3" />
        Vence em {daysRemaining} dias
      </span>
    );
  }

  return null;
}
