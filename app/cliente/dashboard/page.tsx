"use client";

import { ClientShell } from "@/components/client-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  BookOpen,
  Loader2,
  CheckCircle,
  ChevronRight,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { PlanExpirationAlert } from "@/components/plan-expiration-alert";
import { daysLeft, type RenewalStatus } from "@/lib/renewal/rules";
import { todayInSaoPaulo } from "@/lib/time";
import { expiryLabel } from "@/lib/client/expiry-label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivePlan {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string | null;
  dueDateNewMealPlan: string | null;
  paymentUrlNewMealPlan: string | null;
  renewalStatus: RenewalStatus;
}

interface PlanForAlert {
  id: string;
  endDate: string | null;
  dueDateNewMealPlan: string | null;
  paymentUrlNewMealPlan: string | null;
  renewalStatus: RenewalStatus;
  status: string;
}

interface RecentPlan {
  id: string;
  status: string;
  created_at: string;
}

function ClientDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<{ name: string } | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [allPlans, setAllPlans] = useState<PlanForAlert[]>([]);
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          router.push("/cliente/login");
          return;
        }
        const data = await response.json();
        setSession(data.user);
      } catch (error) {
        router.push("/cliente/login");
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    if (searchParams.get("login") === "success") {
      const userName = searchParams.get("name") || "Cliente";
      toast.success(`Bem-vindo, ${userName}!`);

      window.history.replaceState({}, "", "/cliente/dashboard");
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/client/dashboard-stats");
        if (response.ok) {
          const data = await response.json();
          setActivePlan(data.activePlan);
          setAllPlans(data.allPlans || []);
          setRecentPlans(data.recentPlans || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setIsLoadingPlans(false);
      }
    };

    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  if (isLoading || !session) {
    return null;
  }

  const firstName = session.name?.split(" ")[0] || "Cliente";

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + "T00:00:00");
      return format(date, "dd/MM/yyyy", { locale: ptBR });
    } catch (error) {
      return dateString;
    }
  };

  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime())
      ? dateString
      : format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Ativo",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const expiry = activePlan
    ? expiryLabel(daysLeft(activePlan.endDate, todayInSaoPaulo(new Date())))
    : null;
  const expiryUrgent = expiry === "Vencido" || expiry === "Vence hoje";
  const previousPlans = recentPlans.filter((p) => p.id !== activePlan?.id);

  return (
    <ClientShell>
      <Toaster richColors position="top-center" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Olá, {firstName}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe e acesse seu plano alimentar
          </p>
        </div>

        {isLoadingPlans ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {activePlan ? (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CheckCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Seu plano alimentar</CardTitle>
                        <CardDescription className="mt-1">
                          {activePlan.title}
                        </CardDescription>
                      </div>
                    </div>
                    {expiry && (
                      <Badge variant={expiryUrgent ? "destructive" : "secondary"} className="shrink-0">
                        {expiry}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Início: {formatDate(activePlan.startDate)}</span>
                    </div>
                    {activePlan.endDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Fim: {formatDate(activePlan.endDate)}</span>
                      </div>
                    )}
                  </div>
                  <Link href="/cliente/meu-plano">
                    <Button className="w-full" size="lg">
                      <UtensilsCrossed className="mr-2 h-4 w-4" />
                      Abrir meu plano
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-muted">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    Nenhum plano alimentar encontrado
                  </h3>
                  <p className="text-center text-muted-foreground">
                    Seu nutricionista ainda não criou nenhum plano alimentar para
                    você.
                  </p>
                </CardContent>
              </Card>
            )}

            {allPlans.length > 0 && (
              <PlanExpirationAlert plans={allPlans} variant="list" />
            )}

            <Link href="/cliente/receitas" className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Receitas</p>
                    <p className="text-sm text-muted-foreground">Ver receitas</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            {previousPlans.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">Planos anteriores</CardTitle>
                  <Link
                    href="/cliente/planos"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver todos
                  </Link>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border">
                    {previousPlans.map((plan) => (
                      <li
                        key={plan.id}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {formatCreatedAt(plan.created_at)}
                        </span>
                        <Badge variant="secondary">{getStatusLabel(plan.status)}</Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </ClientShell>
  );
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={null}>
      <ClientDashboardContent />
    </Suspense>
  );
}
