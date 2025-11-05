import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Download } from "lucide-react"
import Link from "next/link"

export default function PlanoDetalhePage() {
  // Mock data - substituir com dados reais
  const plano = {
    nome: "Plano de Emagrecimento - Janeiro",
    data: "01/01/2025",
    status: "Ativo",
    calorias: "1800 kcal/dia",
    objetivo: "Emagrecimento saudável",
    refeicoes: [
      {
        nome: "Café da Manhã",
        horario: "07:00 - 08:00",
        alimentos: [
          "2 fatias de pão integral",
          "1 ovo mexido",
          "1 copo de suco de laranja natural",
          "1 porção de frutas (mamão ou banana)",
        ],
        calorias: "350 kcal",
      },
      {
        nome: "Lanche da Manhã",
        horario: "10:00 - 10:30",
        alimentos: ["1 iogurte natural desnatado", "1 colher de sopa de granola"],
        calorias: "150 kcal",
      },
      {
        nome: "Almoço",
        horario: "12:00 - 13:00",
        alimentos: [
          "4 colheres de sopa de arroz integral",
          "2 conchas de feijão",
          "1 filé de frango grelhado (120g)",
          "Salada verde à vontade",
          "2 colheres de sopa de legumes cozidos",
        ],
        calorias: "600 kcal",
      },
      {
        nome: "Lanche da Tarde",
        horario: "15:30 - 16:00",
        alimentos: ["1 fatia de queijo branco", "4 biscoitos integrais"],
        calorias: "150 kcal",
      },
      {
        nome: "Jantar",
        horario: "19:00 - 20:00",
        alimentos: [
          "1 filé de peixe grelhado (150g)",
          "3 colheres de sopa de purê de batata",
          "Salada verde à vontade",
          "Legumes refogados",
        ],
        calorias: "450 kcal",
      },
      {
        nome: "Ceia",
        horario: "21:30 - 22:00",
        alimentos: ["1 xícara de chá de camomila", "2 castanhas"],
        calorias: "100 kcal",
      },
    ],
    observacoes: [
      "Beber no mínimo 2 litros de água por dia",
      "Evitar frituras e alimentos processados",
      "Praticar atividade física 3x por semana",
      "Respeitar os horários das refeições",
    ],
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/cliente/planos">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Planos
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-2xl">{plano.nome}</CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Criado em {plano.data}</span>
                    </div>
                    <span className="font-semibold text-primary">{plano.calorias}</span>
                  </div>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={plano.status === "Ativo" ? "default" : "secondary"}>{plano.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-muted/50 p-4">
              <h3 className="font-semibold text-foreground">Objetivo</h3>
              <p className="mt-1 text-muted-foreground">{plano.objetivo}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Refeições Diárias</h2>
          {plano.refeicoes.map((refeicao, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{refeicao.nome}</CardTitle>
                    <CardDescription>{refeicao.horario}</CardDescription>
                  </div>
                  <Badge variant="outline">{refeicao.calorias}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {refeicao.alimentos.map((alimento, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{alimento}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Observações Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plano.observacoes.map((obs, index) => (
                <li key={index} className="flex items-start gap-2 text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-4">
          <Button className="flex-1 gap-2 bg-transparent" variant="outline">
            <Download className="h-4 w-4" />
            Baixar PDF
          </Button>
        </div>
      </main>
    </div>
  )
}
