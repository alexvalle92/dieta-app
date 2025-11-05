import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EditarPacientePage({ params }: { params: { id: string } }) {
  // Mock data - substituir com dados reais do banco
  const paciente = {
    id: params.id,
    nome: "Maria Silva",
    cpf: "123.456.789-00",
    email: "maria.silva@email.com",
    telefone: "(11) 98765-4321",
    dataNascimento: "1990-05-15",
    peso: "68",
    altura: "165",
    metaPeso: "62",
    observacoes: "Intolerância à lactose. Prefere exercícios leves.",
    status: "Ativo",
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin/pacientes">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Pacientes
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Editar Paciente</CardTitle>
                <CardDescription>Atualize os dados do paciente</CardDescription>
              </div>
              <Badge variant={paciente.status === "Ativo" ? "default" : "secondary"}>{paciente.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input id="nome" defaultValue={paciente.nome} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" defaultValue={paciente.cpf} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">CPF não pode ser alterado</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" defaultValue={paciente.email} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" defaultValue={paciente.telefone} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input id="dataNascimento" type="date" defaultValue={paciente.dataNascimento} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso">Peso Atual (kg)</Label>
                  <Input id="peso" type="number" defaultValue={paciente.peso} />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="altura">Altura (cm)</Label>
                  <Input id="altura" type="number" defaultValue={paciente.altura} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaPeso">Meta de Peso (kg)</Label>
                  <Input id="metaPeso" type="number" defaultValue={paciente.metaPeso} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  defaultValue={paciente.observacoes}
                  placeholder="Restrições alimentares, alergias, condições de saúde..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Salvar Alterações
                </Button>
                <Link href="/admin/pacientes" className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-transparent">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
