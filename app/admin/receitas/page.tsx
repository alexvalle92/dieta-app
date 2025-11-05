import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Clock, Users, Edit, Trash2 } from "lucide-react"
import Link from "next/link"

export default function ReceitasAdminPage() {
  // Mock data - substituir com dados reais
  const receitas = [
    {
      id: 1,
      nome: "Frango Grelhado com Legumes",
      categoria: "Almoço",
      tempoPreparo: "30 min",
      porcoes: "2 porções",
      calorias: "350 kcal",
      status: "Publicada",
    },
    {
      id: 2,
      nome: "Omelete de Claras com Espinafre",
      categoria: "Café da Manhã",
      tempoPreparo: "15 min",
      porcoes: "1 porção",
      calorias: "180 kcal",
      status: "Publicada",
    },
    {
      id: 3,
      nome: "Salada de Quinoa com Vegetais",
      categoria: "Almoço",
      tempoPreparo: "25 min",
      porcoes: "3 porções",
      calorias: "280 kcal",
      status: "Rascunho",
    },
    {
      id: 4,
      nome: "Sopa de Legumes",
      categoria: "Jantar",
      tempoPreparo: "40 min",
      porcoes: "4 porções",
      calorias: "150 kcal",
      status: "Publicada",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Receitas</h1>
            <p className="mt-2 text-muted-foreground">Cadastre e edite receitas disponíveis para os pacientes</p>
          </div>
          <Link href="/admin/receitas/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Receita
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar receitas..." className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {receitas.map((receita) => (
            <Card key={receita.id} className="flex flex-col transition-all hover:shadow-lg">
              <CardHeader>
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant="secondary">{receita.categoria}</Badge>
                  <Badge variant={receita.status === "Publicada" ? "default" : "outline"}>{receita.status}</Badge>
                </div>
                <CardTitle className="text-lg">{receita.nome}</CardTitle>
                <CardDescription>{receita.calorias}</CardDescription>
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
                <div className="mt-4 flex gap-2">
                  <Link href={`/admin/receitas/${receita.id}/editar`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
