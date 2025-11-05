import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Users, Printer } from "lucide-react"
import Link from "next/link"

export default function ReceitaDetalhePage() {
  // Mock data - substituir com dados reais
  const receita = {
    nome: "Frango Grelhado com Legumes",
    descricao: "Receita saudável e saborosa para o almoço",
    tempoPreparo: "30 min",
    porcoes: "2 porções",
    categoria: "Almoço",
    calorias: "350 kcal",
    ingredientes: [
      "2 filés de frango (240g)",
      "1 abobrinha média",
      "1 cenoura média",
      "1 pimentão vermelho",
      "2 colheres de sopa de azeite",
      "Sal e pimenta a gosto",
      "Ervas finas (alecrim, tomilho)",
      "2 dentes de alho",
    ],
    modoPreparo: [
      "Tempere os filés de frango com sal, pimenta, alho amassado e ervas finas. Deixe marinar por 15 minutos.",
      "Corte os legumes em cubos médios.",
      "Aqueça uma frigideira antiaderente em fogo médio e adicione 1 colher de azeite.",
      "Grelhe os filés de frango por 6-8 minutos de cada lado até dourar e cozinhar completamente.",
      "Em outra frigideira, refogue os legumes com o restante do azeite por 8-10 minutos.",
      "Tempere os legumes com sal e pimenta a gosto.",
      "Sirva o frango acompanhado dos legumes refogados.",
    ],
    dicas: [
      "Você pode substituir o frango por peixe ou tofu",
      "Varie os legumes de acordo com sua preferência",
      "Para um sabor extra, adicione limão antes de servir",
    ],
    informacoesNutricionais: {
      calorias: "350 kcal",
      proteinas: "42g",
      carboidratos: "18g",
      gorduras: "12g",
      fibras: "5g",
    },
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/cliente/receitas">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Receitas
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="secondary">{receita.categoria}</Badge>
              <Badge variant="outline">{receita.calorias}</Badge>
            </div>
            <CardTitle className="text-3xl">{receita.nome}</CardTitle>
            <CardDescription className="text-base">{receita.descricao}</CardDescription>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{receita.tempoPreparo}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{receita.porcoes}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ingredientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {receita.ingredientes.map((ingrediente, index) => (
                    <li key={index} className="flex items-start gap-2 text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{ingrediente}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Modo de Preparo</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {receita.modoPreparo.map((passo, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="text-foreground">{passo}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dicas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {receita.dicas.map((dica, index) => (
                    <li key={index} className="flex items-start gap-2 text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-secondary" />
                      <span>{dica}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Nutricionais</CardTitle>
                <CardDescription>Por porção</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calorias</span>
                    <span className="font-semibold text-foreground">{receita.informacoesNutricionais.calorias}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proteínas</span>
                    <span className="font-semibold text-foreground">{receita.informacoesNutricionais.proteinas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carboidratos</span>
                    <span className="font-semibold text-foreground">
                      {receita.informacoesNutricionais.carboidratos}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gorduras</span>
                    <span className="font-semibold text-foreground">{receita.informacoesNutricionais.gorduras}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fibras</span>
                    <span className="font-semibold text-foreground">{receita.informacoesNutricionais.fibras}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full gap-2 bg-transparent" variant="outline">
              <Printer className="h-4 w-4" />
              Imprimir Receita
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
