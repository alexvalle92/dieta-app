import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function EditarPlanoPage({ params }: { params: { id: string } }) {
  // Mock data - substituir com dados reais do banco
  const plano = {
    id: params.id,
    pacienteId: "1",
    pacienteNome: "Maria Silva",
    nomePlano: "Plano de Emagrecimento - Janeiro",
    calorias: "1800",
    objetivo: "Reduzir 6kg em 3 meses de forma saudável e sustentável",
    status: "Ativo",
    refeicoes: [
      {
        nome: "Café da Manhã",
        horario: "07:00 - 08:00",
        calorias: "350 kcal",
        alimentos: "2 fatias de pão integral\n1 ovo mexido\n1 copo de leite desnatado\n1 banana",
      },
      {
        nome: "Almoço",
        horario: "12:00 - 13:00",
        calorias: "600 kcal",
        alimentos: "150g de frango grelhado\n4 colheres de arroz integral\n1 concha de feijão\nSalada verde à vontade",
      },
    ],
    observacoes: "Beber pelo menos 2L de água por dia. Evitar frituras e doces.",
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin/planos">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Planos
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Editar Plano Alimentar</CardTitle>
                <CardDescription>Atualize o plano alimentar do paciente</CardDescription>
              </div>
              <Badge variant={plano.status === "Ativo" ? "default" : "secondary"}>{plano.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="paciente">Paciente *</Label>
                <Select defaultValue={plano.pacienteId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Maria Silva</SelectItem>
                    <SelectItem value="2">João Santos</SelectItem>
                    <SelectItem value="3">Ana Costa</SelectItem>
                    <SelectItem value="4">Pedro Oliveira</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nomePlano">Nome do Plano *</Label>
                  <Input id="nomePlano" defaultValue={plano.nomePlano} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calorias">Calorias Diárias *</Label>
                  <Input id="calorias" type="number" defaultValue={plano.calorias} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo do Plano</Label>
                <Textarea id="objetivo" defaultValue={plano.objetivo} rows={3} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Refeições</Label>
                  <Button type="button" variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Plus className="h-4 w-4" />
                    Adicionar Refeição
                  </Button>
                </div>

                {plano.refeicoes.map((refeicao, index) => (
                  <Card key={index} className="border-2">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{refeicao.nome}</CardTitle>
                        <Button type="button" variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`horario${index}`}>Horário</Label>
                          <Input id={`horario${index}`} defaultValue={refeicao.horario} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`calorias${index}`}>Calorias</Label>
                          <Input id={`calorias${index}`} defaultValue={refeicao.calorias} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`alimentos${index}`}>Alimentos</Label>
                        <Textarea id={`alimentos${index}`} defaultValue={refeicao.alimentos} rows={4} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Importantes</Label>
                <Textarea id="observacoes" defaultValue={plano.observacoes} rows={4} />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Salvar Alterações
                </Button>
                <Link href="/admin/planos" className="flex-1">
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
