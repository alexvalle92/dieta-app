import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NovoPacientePage() {
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
            <CardTitle className="text-2xl">Cadastrar Novo Paciente</CardTitle>
            <CardDescription>Preencha os dados do paciente abaixo</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input id="nome" placeholder="Nome do paciente" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input id="cpf" placeholder="000.000.000-00" />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input id="dataNascimento" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="peso">Peso Atual (kg)</Label>
                  <Input id="peso" type="number" placeholder="70" />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="altura">Altura (cm)</Label>
                  <Input id="altura" type="number" placeholder="170" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaPeso">Meta de Peso (kg)</Label>
                  <Input id="metaPeso" type="number" placeholder="65" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  placeholder="Restrições alimentares, alergias, condições de saúde..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha Temporária *</Label>
                <Input id="senha" type="password" placeholder="Senha para primeiro acesso" />
                <p className="text-xs text-muted-foreground">O paciente poderá alterar a senha no primeiro acesso</p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Cadastrar Paciente
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
