import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, User, Edit } from "lucide-react"
import Link from "next/link"

export default function PlanosAdminPage() {
  // Mock data - substituir com dados reais
  const planos = [
    {
      id: 1,
      paciente: "Maria Silva",
      nome: "Plano de Emagrecimento - Janeiro",
      calorias: "1800 kcal/dia",
      dataCriacao: "15/01/2025",
      status: "Ativo",
    },
    {
      id: 2,
      paciente: "João Santos",
      nome: "Plano de Manutenção",
      calorias: "2000 kcal/dia",
      dataCriacao: "10/01/2025",
      status: "Ativo",
    },
    {
      id: 3,
      paciente: "Pedro Oliveira",
      nome: "Plano Low Carb",
      calorias: "1600 kcal/dia",
      dataCriacao: "20/01/2025",
      status: "Ativo",
    },
    {
      id: 4,
      paciente: "Ana Costa",
      nome: "Plano Inicial",
      calorias: "1700 kcal/dia",
      dataCriacao: "05/12/2024",
      status: "Concluído",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Planos</h1>
            <p className="mt-2 text-muted-foreground">Cadastre e edite planos alimentares dos pacientes</p>
          </div>
          <Link href="/admin/planos/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por paciente ou nome do plano..." className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {planos.map((plano) => (
            <Card key={plano.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{plano.nome}</CardTitle>
                      <Badge variant={plano.status === "Ativo" ? "default" : "secondary"}>{plano.status}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {plano.calorias} • Criado em {plano.dataCriacao}
                    </CardDescription>
                  </div>
                  <Link href={`/admin/planos/${plano.id}/editar`}>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Edit className="h-4 w-4" />
                      Editar
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Paciente: {plano.paciente}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
