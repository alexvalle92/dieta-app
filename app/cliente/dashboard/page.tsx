"use client";

import { ClientNav } from "@/components/client-nav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText,
  Calendar,
  BookOpen,
  Loader2,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { PlanExpirationAlert } from "@/components/plan-expiration-alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  planosAtivos: number;
  totalPlanos: number;
  ultimaAtualizacao: string;
  receitasDisponiveis: number;
}

interface ActivePlan {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string | null;
  dueDateNewMealPlan: string | null;
  paymentUrlNewMealPlan: string | null;
}

interface PlanForAlert {
  id: string;
  endDate: string | null;
  dueDateNewMealPlan: string | null;
  paymentUrlNewMealPlan: string | null;
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [allPlans, setAllPlans] = useState<PlanForAlert[]>([]);
  const [recentPlans, setRecentPlans] = useState<RecentPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setStats(data.stats);
          setActivePlan(data.activePlan);
          setAllPlans(data.allPlans || []);
          setRecentPlans(data.recentPlans);
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
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

  const hasActivePlanNotExpired = () => {
    if (!activePlan || !activePlan.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(activePlan.endDate + "T00:00:00");
    return endDate >= today;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Ativo",
      completed: "Concluído",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "text-green-600",
      completed: "text-blue-600",
      cancelled: "text-gray-600",
    };
    return colors[status] || "text-gray-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <ClientNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Olá, {firstName}! 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Acompanhe seu progresso e acesse seus planos alimentares
          </p>
        </div>

        {activePlan && hasActivePlanNotExpired() ? (
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                    <CheckCircle className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Plano Alimentar Ativo
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {activePlan.title}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-600">
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
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
              <Link href={`/cliente/planos/${activePlan.id}`}>
                <Button className="w-full sm:w-auto">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Detalhes do Plano
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : allPlans.length > 0 ? (
          <div className="mb-8">
            <PlanExpirationAlert plans={allPlans} variant="list" />
          </div>
        ) : (
          <Card className="mb-8 border-muted">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Nenhum plano alimentar encontrado
              </h3>
              <p className="text-muted-foreground text-center">
                Seu nutricionista ainda não criou nenhum plano alimentar para
                você.
              </p>
            </CardContent>
          </Card>
        )}

        {!stats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Planos
                  </CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats.totalPlanos}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Planos cadastrados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Última Atualização
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats.ultimaAtualizacao}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Último plano cadastrado
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Receitas
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {stats.receitasDisponiveis}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receitas disponíveis
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ClientDashboardPage() {
  return (
    <Suspense fallback={null}>
      <ClientDashboardContent />
    </Suspense>
  );
}
