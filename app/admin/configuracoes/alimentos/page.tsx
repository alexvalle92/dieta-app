'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ArrowLeft, Utensils, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Toaster } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface MealCategory {
  id: string
  name: string
}

interface Recipe {
  id: string
  title: string
}

interface AllowedItem {
  id: string
  itemType: 'food' | 'recipe'
  foodName?: string
  category: { id: string; name: string }
  recipe?: { id: string; title: string }
}

export default function AllowedItemsSettings() {
  const [items, setItems] = useState<AllowedItem[]>([])
  const [categories, setCategories] = useState<MealCategory[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  
  const [selectedCategory, setSelectedCategory] = useState('')
  const [itemType, setItemType] = useState<'food' | 'recipe'>('food')
  const [foodName, setFoodName] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes, recipesRes] = await Promise.all([
        fetch('/api/admin/allowed-items'),
        fetch('/api/admin/meal-categories'),
        fetch('/api/admin/recipes')
      ])
      
      const itemsData = await itemsRes.json()
      const catsData = await catsRes.json()
      const recipesData = await recipesRes.json()
      
      if (itemsData.items) setItems(itemsData.items)
      if (catsData.categories) setCategories(catsData.categories)
      if (recipesData.recipes) setRecipes(recipesData.recipes)
    } catch (error) {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || (itemType === 'food' && !foodName.trim()) || (itemType === 'recipe' && !selectedRecipe)) {
      return
    }

    setAdding(true)
    try {
      const res = await fetch('/api/admin/allowed-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mealCategoryId: selectedCategory,
          itemType,
          foodName: itemType === 'food' ? foodName.trim() : null,
          recipeId: itemType === 'recipe' ? selectedRecipe : null
        })
      })
      if (!res.ok) throw new Error()
      setFoodName('')
      setSelectedRecipe('')
      fetchData()
      toast.success('Item adicionado com sucesso!')
    } catch (error) {
      toast.error('Erro ao adicionar item')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/allowed-items/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error()
      setItems(items.filter(i => i.id !== id))
      toast.success('Item removido!')
    } catch (error) {
      toast.error('Erro ao excluir item')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <Toaster richColors position="top-center" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Link href="/admin/configuracoes">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Alimentos Permitidos</h1>
            <p className="mt-2 text-muted-foreground">Gerencie quais alimentos ou receitas são permitidos em cada refeição</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Adicionar Item</CardTitle>
              <CardDescription>Cadastre um novo alimento ou receita permitida</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Refeição</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a refeição..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Item</label>
                  <Select value={itemType} onValueChange={(v: any) => setItemType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Alimento Simples</SelectItem>
                      <SelectItem value="recipe">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {itemType === 'food' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome do Alimento</label>
                    <Input
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                      placeholder="Ex: Arroz Branco, Ovo Cozido..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Receita</label>
                    <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a receita..." />
                      </SelectTrigger>
                      <SelectContent>
                        {recipes.map(recipe => (
                          <SelectItem key={recipe.id} value={recipe.id}>{recipe.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={adding || !selectedCategory}>
                  {adding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Adicionar à Lista
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Itens Cadastrados</CardTitle>
              <CardDescription>Lista consolidada de itens permitidos por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
              ) : items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum item cadastrado ainda.</p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground font-medium border-b">
                      <tr>
                        <th className="px-4 py-3">Refeição</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Conteúdo</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 font-medium">{item.category.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant={item.itemType === 'recipe' ? 'secondary' : 'outline'} className="gap-1">
                              {item.itemType === 'recipe' ? <BookOpen className="h-3 w-3" /> : <Utensils className="h-3 w-3" />}
                              {item.itemType === 'recipe' ? 'Receita' : 'Alimento'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {item.itemType === 'recipe' ? item.recipe?.title : item.foodName}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
