import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Mail, Phone, Edit, Key } from "lucide-react"
import Link from "next/link"

export default function PacientesPage() {
  // Mock data - substituir com dados reais
  const pacientes = [
    {
      id: 1,
      nome: "Maria Silva",
      email: "maria.silva@email.com",
      telefone: "(11) 98765-4321",
      cpf: "123.456.789-00",
      dataInicio: "15/01/2025",
      status: "Ativo",
      planosAtivos: 1,
    },
    {
      id: 2,
      nome: "João Santos",
      email: "joao.santos@email.com",
      telefone: "(11) 98765-4322",
      cpf: "234.567.890-11",
      dataInicio: "10/01/2025",
      status: "Ativo",
      planosAtivos: 1,
    },
    {
      id: 3,
      nome: "Ana Costa",
      email: "ana.costa@email.com",
      telefone: "(11) 98765-4323",
      cpf: "345.678.901-22",
      dataInicio: "05/12/2024",
      status: "Inativo",
      planosAtivos: 0,
    },
    {
      id: 4,
      nome: "Pedro Oliveira",
      email: "pedro.oliveira@email.com",
      telefone: "(11) 98765-4324",
      cpf: "456.789.012-33",
      dataInicio: "20/01/2025",
      status: "Ativo",
      planosAtivos: 2,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Pacientes</h1>
            <p className="mt-2 text-muted-foreground">Cadastre e gerencie os pacientes da plataforma</p>
          </div>
          <Link href="/admin/pacientes/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Paciente
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, email ou CPF..." className="pl-10" />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {pacientes.map((paciente) => (
            <Card key={paciente.id} className="transition-all hover:shadow-lg">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{paciente.nome}</CardTitle>
                      <Badge variant={paciente.status === "Ativo" ? "default" : "secondary"}>{paciente.status}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      CPF: {paciente.cpf} • Cadastrado em {paciente.dataInicio}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/admin/pacientes/${paciente.id}/editar`}>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Key className="h-4 w-4" />
                      Redefinir Senha
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{paciente.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{paciente.telefone}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Planos ativos: </span>
                    <span className="font-semibold text-primary">{paciente.planosAtivos}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
