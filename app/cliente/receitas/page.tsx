import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ChefHat } from "lucide-react"
import Link from "next/link"

export default function ReceitasPage() {
  // Mock data - substituir com dados reais
  const receitas = [
    {
      id: 1,
      nome: "Frango Grelhado com Legumes",
      descricao: "Receita saudável e saborosa para o almoço",
      tempoPreparo: "30 min",
      porcoes: "2 porções",
      categoria: "Almoço",
      calorias: "350 kcal",
    },
    {
      id: 2,
      nome: "Omelete de Claras com Espinafre",
      descricao: "Opção leve e nutritiva para o café da manhã",
      tempoPreparo: "15 min",
      porcoes: "1 porção",
      categoria: "Café da Manhã",
      calorias: "180 kcal",
    },
    {
      id: 3,
      nome: "Salada de Quinoa com Vegetais",
      descricao: "Salada completa e refrescante",
      tempoPreparo: "25 min",
      porcoes: "3 porções",
      categoria: "Almoço",
      calorias: "280 kcal",
    },
    {
      id: 4,
      nome: "Sopa de Legumes",
      descricao: "Sopa nutritiva e reconfortante",
      tempoPreparo: "40 min",
      porcoes: "4 porções",
      categoria: "Jantar",
      calorias: "150 kcal",
    },
    {
      id: 5,
      nome: "Smoothie Verde Detox",
      descricao: "Bebida refrescante e nutritiva",
      tempoPreparo: "5 min",
      porcoes: "1 porção",
      categoria: "Lanche",
      calorias: "120 kcal",
    },
    {
      id: 6,
      nome: "Peixe Assado com Ervas",
      descricao: "Jantar leve e saboroso",
      tempoPreparo: "35 min",
      porcoes: "2 porções",
      categoria: "Jantar",
      calorias: "320 kcal",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Receitas Saudáveis</h1>
          <p className="mt-2 text-muted-foreground">
            Explore receitas deliciosas e nutritivas para complementar seu plano
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {receitas.map((receita) => (
            <Card key={receita.id} className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="secondary">{receita.categoria}</Badge>
                  <Badge variant="outline">{receita.calorias}</Badge>
                </div>
                <CardTitle className="text-lg">{receita.nome}</CardTitle>
                <CardDescription>{receita.descricao}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{receita.tempoPreparo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{receita.porcoes}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/cliente/receitas/${receita.id}`}>
                    <Button className="w-full gap-2">
                      <ChefHat className="h-4 w-4" />
                      Ver Receita
                    </Button>
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
