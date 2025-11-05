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

export default function EditarReceitaPage({ params }: { params: { id: string } }) {
  // Mock data - substituir com dados reais do banco
  const receita = {
    id: params.id,
    nome: "Frango Grelhado com Legumes",
    descricao: "Prato leve e nutritivo, perfeito para o almoço",
    categoria: "almoco",
    tempo: "30 min",
    porcoes: "2 porções",
    status: "Publicada",
    ingredientes: ["2 filés de frango (240g)", "1 abobrinha média", "1 cenoura", "Temperos a gosto"],
    preparo: [
      "Tempere os filés de frango com sal, pimenta e limão",
      "Aqueça a frigideira e grelhe o frango por 5-7 minutos de cada lado",
      "Corte os legumes em rodelas e refogue com azeite",
    ],
    dicas: "Pode substituir o frango por peixe. Sirva com arroz integral.",
    nutricao: {
      calorias: "350 kcal",
      proteinas: "42g",
      carboidratos: "18g",
      gorduras: "12g",
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin/receitas">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Receitas
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Editar Receita</CardTitle>
                <CardDescription>Atualize os detalhes da receita</CardDescription>
              </div>
              <Badge variant={receita.status === "Publicada" ? "default" : "outline"}>{receita.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Receita *</Label>
                <Input id="nome" defaultValue={receita.nome} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" defaultValue={receita.descricao} rows={2} />
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select defaultValue={receita.categoria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cafe">Café da Manhã</SelectItem>
                      <SelectItem value="almoco">Almoço</SelectItem>
                      <SelectItem value="jantar">Jantar</SelectItem>
                      <SelectItem value="lanche">Lanche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempo">Tempo de Preparo</Label>
                  <Input id="tempo" defaultValue={receita.tempo} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="porcoes">Porções</Label>
                  <Input id="porcoes" defaultValue={receita.porcoes} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Ingredientes</Label>
                  <Button type="button" variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {receita.ingredientes.map((ingrediente, index) => (
                    <div key={index} className="flex gap-2">
                      <Input defaultValue={ingrediente} className="flex-1" />
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Modo de Preparo</Label>
                  <Button type="button" variant="outline" size="sm" className="gap-2 bg-transparent">
                    <Plus className="h-4 w-4" />
                    Adicionar Passo
                  </Button>
                </div>
                <div className="space-y-2">
                  {receita.preparo.map((passo, index) => (
                    <div key={index} className="flex gap-2">
                      <Textarea defaultValue={passo} rows={2} className="flex-1" />
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dicas">Dicas</Label>
                <Textarea id="dicas" defaultValue={receita.dicas} rows={3} />
              </div>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Nutricionais (por porção)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="calorias">Calorias</Label>
                      <Input id="calorias" defaultValue={receita.nutricao.calorias} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proteinas">Proteínas</Label>
                      <Input id="proteinas" defaultValue={receita.nutricao.proteinas} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carboidratos">Carboidratos</Label>
                      <Input id="carboidratos" defaultValue={receita.nutricao.carboidratos} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gorduras">Gorduras</Label>
                      <Input id="gorduras" defaultValue={receita.nutricao.gorduras} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Salvar Alterações
                </Button>
                <Button type="button" variant="outline" className="flex-1 bg-transparent">
                  Salvar como Rascunho
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
