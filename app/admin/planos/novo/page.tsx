import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function NovoPlanoPage() {
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
            <CardTitle className="text-2xl">Criar Novo Plano Alimentar</CardTitle>
            <CardDescription>Configure o plano alimentar do paciente</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="paciente">Paciente *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
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
                  <Input id="nomePlano" placeholder="Ex: Plano de Emagrecimento" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calorias">Calorias Diárias *</Label>
                  <Input id="calorias" type="number" placeholder="1800" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo do Plano</Label>
                <Textarea id="objetivo" placeholder="Descreva o objetivo deste plano alimentar..." rows={3} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Refeições</Label>
                  <Button type="button" variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Plus className="h-4 w-4" />
                    Adicionar Refeição
                  </Button>
                </div>

                <Card className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Café da Manhã</CardTitle>
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="horario1">Horário</Label>
                        <Input id="horario1" placeholder="07:00 - 08:00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calorias1">Calorias</Label>
                        <Input id="calorias1" placeholder="350 kcal" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alimentos1">Alimentos</Label>
                      <Textarea id="alimentos1" placeholder="Liste os alimentos (um por linha)" rows={4} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Almoço</CardTitle>
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="horario2">Horário</Label>
                        <Input id="horario2" placeholder="12:00 - 13:00" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calorias2">Calorias</Label>
                        <Input id="calorias2" placeholder="600 kcal" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alimentos2">Alimentos</Label>
                      <Textarea id="alimentos2" placeholder="Liste os alimentos (um por linha)" rows={4} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Importantes</Label>
                <Textarea id="observacoes" placeholder="Dicas, restrições, orientações gerais..." rows={4} />
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Criar Plano
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
