'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
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

export default function EditarReceitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    prep_time: '',
    servings: '',
    calories: '',
    tips: '',
  })

  const [ingredients, setIngredients] = useState<string[]>([''])
  const [preparationSteps, setPreparationSteps] = useState<string[]>([''])

  useEffect(() => {
    fetchRecipe()
  }, [id])

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/admin/recipes/${id}`)
      const data = await response.json()

      if (response.ok) {
        const recipeData = data.recipe
        setRecipe(recipeData)
        
        setFormData({
          title: recipeData.title,
          description: recipeData.description || '',
          category: recipeData.category || '',
          prep_time: recipeData.prep_time?.toString() || '',
          servings: recipeData.servings?.toString() || '',
          calories: recipeData.calories?.toString() || '',
          tips: recipeData.tips || '',
        })

        setIngredients(recipeData.ingredients && recipeData.ingredients.length > 0 
          ? recipeData.ingredients 
          : [''])
        
        const steps = recipeData.preparation ? recipeData.preparation.split('\n').filter((s: string) => s.trim()) : ['']
        setPreparationSteps(steps.length > 0 ? steps : [''])
      } else {
        toast.error(data.error || 'Erro ao carregar receita')
        router.push('/admin/receitas')
      }
    } catch (error) {
      toast.error('Erro ao carregar receita')
      router.push('/admin/receitas')
    } finally {
      setIsLoading(false)
    }
  }

  const addIngredient = () => {
    setIngredients([...ingredients, ''])
  }

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index))
    }
  }

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients]
    newIngredients[index] = value
    setIngredients(newIngredients)
  }

  const addPreparationStep = () => {
    setPreparationSteps([...preparationSteps, ''])
  }

  const removePreparationStep = (index: number) => {
    if (preparationSteps.length > 1) {
      setPreparationSteps(preparationSteps.filter((_, i) => i !== index))
    }
  }

  const updatePreparationStep = (index: number, value: string) => {
    const newSteps = [...preparationSteps]
    newSteps[index] = value
    setPreparationSteps(newSteps)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Digite o nome da receita')
      return
    }

    const validIngredients = ingredients.filter(ing => ing.trim())
    if (validIngredients.length === 0) {
      toast.error('Adicione pelo menos um ingrediente')
      return
    }

    const validSteps = preparationSteps.filter(step => step.trim())
    if (validSteps.length === 0) {
      toast.error('Adicione pelo menos um passo do modo de preparo')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category || null,
        prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
        servings: formData.servings ? parseInt(formData.servings) : null,
        calories: formData.calories ? parseInt(formData.calories) : null,
        ingredients: validIngredients,
        preparation: validSteps.join('\n'),
        tips: formData.tips.trim() || null,
      }

      const response = await fetch(`/api/admin/recipes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Receita atualizada com sucesso!')
        router.push('/admin/receitas')
        router.refresh()
      } else {
        toast.error(data.error || 'Erro ao atualizar receita')
      }
    } catch (error) {
      toast.error('Erro ao atualizar receita')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">Receita não encontrada</p>
                <Link href="/admin/receitas">
                  <Button className="mt-4">Voltar para Receitas</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <Toaster />
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
            <CardTitle className="text-2xl">Editar Receita</CardTitle>
            <CardDescription>Atualize os detalhes da receita</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Receita *</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: Frango Grelhado com Legumes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea 
                  id="descricao" 
                  placeholder="Breve descrição da receita..." 
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select 
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={isSubmitting}
                  >
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
                  <Label htmlFor="tempo">Tempo de Preparo (min)</Label>
                  <Input 
                    id="tempo" 
                    type="number"
                    placeholder="30"
                    value={formData.prep_time}
                    onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="porcoes">Porções</Label>
                  <Input 
                    id="porcoes" 
                    type="number"
                    placeholder="2"
                    value={formData.servings}
                    onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Ingredientes *</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-transparent"
                    onClick={addIngredient}
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {ingredients.map((ingredient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input 
                        placeholder="Ex: 2 filés de frango (240g)" 
                        className="flex-1"
                        value={ingredient}
                        onChange={(e) => updateIngredient(index, e.target.value)}
                        disabled={isSubmitting}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removeIngredient(index)}
                        disabled={isSubmitting || ingredients.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Modo de Preparo *</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-transparent"
                    onClick={addPreparationStep}
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Passo
                  </Button>
                </div>
                <div className="space-y-2">
                  {preparationSteps.map((step, index) => (
                    <div key={index} className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Passo {index + 1}</Label>
                        <Textarea 
                          placeholder={`Descreva o passo ${index + 1}...`}
                          rows={2}
                          value={step}
                          onChange={(e) => updatePreparationStep(index, e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm"
                        onClick={() => removePreparationStep(index)}
                        disabled={isSubmitting || preparationSteps.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tips">Dicas Extras / Observações</Label>
                <Textarea 
                  id="tips" 
                  placeholder="Adicione dicas extras, observações ou sugestões para a receita..." 
                  rows={4}
                  value={formData.tips}
                  onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Nutricionais (por porção)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="calorias">Calorias (kcal)</Label>
                      <Input 
                        id="calorias" 
                        type="number"
                        placeholder="350"
                        value={formData.calories}
                        onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
                <Link href="/admin/receitas" className="flex-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full bg-transparent"
                    disabled={isSubmitting}
                  >
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
