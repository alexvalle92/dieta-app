'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, Users, Printer, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Toaster } from "sonner"

interface Recipe {
  id: string
  title: string
  description: string | null
  ingredients: string[]
  preparation: string
  tips: string | null
  prep_time: number | null
  servings: number | null
  calories: number | null
  category: string | null
}

export default function ReceitaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRecipe()
  }, [id])

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/client/recipes/${id}`)
      const data = await response.json()

      if (response.ok) {
        setRecipe(data.recipe)
      } else {
        toast.error(data.error || 'Erro ao carregar receita')
        router.push('/cliente/receitas')
      }
    } catch (error) {
      toast.error('Erro ao carregar receita')
      router.push('/cliente/receitas')
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return 'Sem categoria'
    
    const categories: Record<string, string> = {
      'cafe': 'Café da Manhã',
      'almoco': 'Almoço',
      'jantar': 'Jantar',
      'lanche': 'Lanche',
    }
    
    return categories[category] || category
  }

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <main className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <ClientNav />
        <Toaster />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">Receita não encontrada</p>
                <Link href="/cliente/receitas">
                  <Button className="mt-4">Voltar para Receitas</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const preparationSteps = recipe.preparation.split('\n').filter(step => step.trim())

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <Toaster />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 print:hidden">
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
              <Badge variant="secondary">{getCategoryLabel(recipe.category)}</Badge>
              {recipe.calories && (
                <Badge variant="outline">{recipe.calories} kcal</Badge>
              )}
            </div>
            <CardTitle className="text-3xl">{recipe.title}</CardTitle>
            {recipe.description && (
              <CardDescription className="text-base">{recipe.description}</CardDescription>
            )}
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
              {recipe.prep_time && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{recipe.prep_time} min</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{recipe.servings} {recipe.servings === 1 ? 'porção' : 'porções'}</span>
                </div>
              )}
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
                  {recipe.ingredients.map((ingrediente, index) => (
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
                  {preparationSteps.map((passo, index) => (
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

            {recipe.tips && (
              <Card>
                <CardHeader>
                  <CardTitle>Dicas e Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{recipe.tips}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {recipe.calories && (
              <Card>
                <CardHeader>
                  <CardTitle>Informações Nutricionais</CardTitle>
                  <CardDescription>Por porção</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Calorias</span>
                      <span className="font-semibold text-foreground">{recipe.calories} kcal</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              className="w-full gap-2 bg-transparent print:hidden" 
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Imprimir Receita
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
