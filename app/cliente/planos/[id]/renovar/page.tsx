"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { ArrowLeft, CreditCard, Loader2 } from "lucide-react";
import { ClientNav } from "@/components/client-nav";
import { RenewalForm } from "@/components/renewal-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RENEWAL_BLOCK_MESSAGES, type RenewalBlock } from "@/lib/renewal/messages";
import type { RenewalAnswers } from "@/lib/validation/renewal";

interface RenewalFormData {
  eligible: boolean;
  reason: RenewalBlock | null;
  answers: Partial<RenewalAnswers>;
}

export default function RenovarPlanoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<RenewalFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Preenchido quando o envio dá certo: a página troca o formulário pela confirmação.
  const [result, setResult] = useState<{ paymentUrl: string | null } | null>(null);

  // Gerado uma vez por abertura da página e reusado em toda nova tentativa de envio.
  const submissionId = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`/api/client/meal-plans/${id}/renewal`);
        if (response.status === 404) {
          router.push("/cliente/planos");
          return;
        }
        const body = await response.json();
        if (response.ok) {
          setData(body as RenewalFormData);
        } else {
          setLoadError(body.error || "Não foi possível carregar o formulário.");
        }
      } catch (error) {
        console.error("Error fetching renewal form:", error);
        setLoadError("Não foi possível carregar o formulário.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

  const handleSubmit = async (answers: RenewalAnswers) => {
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    setSubmitting(true);
    try {
      const response = await fetch(`/api/client/meal-plans/${id}/renewal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submissionId.current, answers }),
      });
      const body = await response.json().catch(() => ({}));

      if (response.ok) {
        setResult({ paymentUrl: body.paymentUrl ?? null });
        window.scrollTo({ top: 0 });
      } else {
        // O formulário continua preenchido para uma nova tentativa.
        toast.error(body.error || "Não foi possível enviar seus dados agora.");
      }
    } catch (error) {
      console.error("Error submitting renewal form:", error);
      toast.error("Não foi possível enviar seus dados agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (
    <div className="mb-6">
      <Link href={`/cliente/planos/${id}`}>
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para o plano
        </Button>
      </Link>
    </div>
  );

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (loadError || !data) {
    content = (
      <>
        {backButton}
        <Card>
          <CardContent>
            <p className="text-foreground">
              {loadError ?? "Não foi possível carregar o formulário."}
            </p>
          </CardContent>
        </Card>
      </>
    );
  } else if (!data.eligible) {
    content = (
      <>
        {backButton}
        <Card>
          <CardContent>
            <p className="text-foreground">
              {data.reason
                ? RENEWAL_BLOCK_MESSAGES[data.reason]
                : "O formulário de atualização não está disponível no momento."}
            </p>
          </CardContent>
        </Card>
      </>
    );
  } else if (result) {
    content = (
      <>
        {backButton}
        <Card>
          <CardContent className="space-y-4">
            {result.paymentUrl ? (
              <>
                <p className="text-foreground">
                  Dados enviados! Para liberar seu novo plano, efetue o pagamento.
                </p>
                <Link href={result.paymentUrl} target="_blank">
                  <Button className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <CreditCard className="h-4 w-4" />
                    Efetuar Pagamento
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-foreground">
                Dados enviados! Seu link de pagamento está sendo gerado. Ele chega
                por e-mail e WhatsApp em instantes e também aparece na tela do seu
                plano.
              </p>
            )}
          </CardContent>
        </Card>
      </>
    );
  } else {
    content = (
      <>
        {backButton}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Atualização do plano alimentar
          </h1>
          <p className="mt-2 text-muted-foreground">
            Confira suas respostas e atualize o que mudou. Leva menos de 3 minutos.
          </p>
        </div>
        <RenewalForm
          initial={data.answers}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <ClientNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">{content}</main>
    </div>
  );
}
