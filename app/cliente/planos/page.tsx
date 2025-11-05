import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar } from "lucide-react"
import Link from "next/link"

export default function ClientPlanosPage() {
  // Mock data - substituir com dados reais
  const planos = [
    {
      id: 1,
      nome: "Plano de Emagrecimento - Janeiro",
      descricao: "Plano focado em emagrecimento saudável com 1800 calorias diárias",
      data: "01/01/2025",
      status: "Ativo",
      calorias: "1800 kcal/dia",
    },
    {
      id: 2,
      nome: "Plano de Manutenção - Dezembro",
      descricao: "Plano de manutenção com 2000 calorias diárias",
      data: "01/12/2024",
      status: "Concluído",
      calorias: "2000 kcal/dia",
    },
    {
      id: 3,
      nome: "Plano Inicial - Novembro",
      descricao: "Primeiro plano alimentar personalizado",
      data: "15/11/2024",
      status: "Concluído",
      calorias: "1600 kcal/dia",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meus Planos Alimentares</h1>
          <p className="mt-2 text-muted-foreground">Visualize e acompanhe todos os seus planos alimentares</p>
        </div>

        <div className="grid gap-6">
          {planos.map((plano) => (
            <Card key={plano.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{plano.nome}</CardTitle>
                      <CardDescription className="mt-1">{plano.descricao}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={plano.status === "Ativo" ? "default" : "secondary"}>{plano.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Criado em {plano.data}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{plano.calorias}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/cliente/planos/${plano.id}`}>
                    <Button className="w-full sm:w-auto">Ver Detalhes do Plano</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
