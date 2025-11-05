import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

export default function NovaReceitaPage() {
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
            <CardTitle className="text-2xl">Cadastrar Nova Receita</CardTitle>
            <CardDescription>Preencha os detalhes da receita</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Receita *</Label>
                <Input id="nome" placeholder="Ex: Frango Grelhado com Legumes" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" placeholder="Breve descrição da receita..." rows={2} />
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
                  <Input id="tempo" placeholder="30 min" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="porcoes">Porções</Label>
                  <Input id="porcoes" placeholder="2 porções" />
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
                  <div className="flex gap-2">
                    <Input placeholder="Ex: 2 filés de frango (240g)" className="flex-1" />
                    <Button type="button" variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Ex: 1 abobrinha média" className="flex-1" />
                    <Button type="button" variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
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
                  <Textarea placeholder="Passo 1: Tempere os filés de frango..." rows={2} />
                  <Textarea placeholder="Passo 2: Aqueça a frigideira..." rows={2} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dicas">Dicas</Label>
                <Textarea id="dicas" placeholder="Dicas e sugestões para a receita..." rows={3} />
              </div>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Nutricionais (por porção)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="calorias">Calorias</Label>
                      <Input id="calorias" placeholder="350 kcal" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="proteinas">Proteínas</Label>
                      <Input id="proteinas" placeholder="42g" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carboidratos">Carboidratos</Label>
                      <Input id="carboidratos" placeholder="18g" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gorduras">Gorduras</Label>
                      <Input id="gorduras" placeholder="12g" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1">
                  Publicar Receita
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
