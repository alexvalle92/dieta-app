'use client'

import { useState, useEffect } from 'react'
import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ChefHat, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Toaster } from "sonner"

interface Recipe {
  id: string
  title: string
  description: string | null
  prep_time: number | null
  servings: number | null
  category: string | null
  calories: number | null
}

export default function ReceitasPage() {
  const [receitas, setReceitas] = useState<Recipe[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async (search?: string) => {
    try {
      setIsLoading(true)
      const url = search 
        ? `/api/client/recipes?search=${encodeURIComponent(search)}`
        : '/api/client/recipes'
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setReceitas(data.recipes || [])
      } else {
        toast.error(data.error || 'Erro ao carregar receitas')
      }
    } catch (error) {
      toast.error('Erro ao carregar receitas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.trim()) {
      fetchRecipes(value.trim())
    } else {
      fetchRecipes()
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

  return (
    <div className="min-h-screen bg-background">
      <ClientNav />
      <Toaster />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Receitas Saudáveis</h1>
          <p className="mt-2 text-muted-foreground">
            Explore receitas deliciosas e nutritivas para complementar seu plano
          </p>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar receitas..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : receitas.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Nenhuma receita encontrada para sua busca.' 
                    : 'Nenhuma receita disponível no momento.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {receitas.map((receita) => (
              <Card key={receita.id} className="flex flex-col transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant="secondary">{getCategoryLabel(receita.category)}</Badge>
                    {receita.calories && (
                      <Badge variant="outline">{receita.calories} kcal</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{receita.title}</CardTitle>
                  <CardDescription>{receita.description || 'Receita saudável e nutritiva'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {receita.prep_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{receita.prep_time} min</span>
                      </div>
                    )}
                    {receita.servings && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{receita.servings} {receita.servings === 1 ? 'porção' : 'porções'}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <Link href={`/cliente/receitas/${receita.id}`}>
                      <Button className="w-full gap-2">
                        <ChefHat className="h-4 w-4" />
                        Ver Receita
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
