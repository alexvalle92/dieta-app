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
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface Patient {
  id: string
  name: string
}

interface Meal {
  id: string
  name: string
  time: string
  calories: string
  foods: string
}

interface MealPlan {
  id: string
  patient_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  status: 'active' | 'completed' | 'cancelled'
  plan_data: any
  patient: {
    name: string
  }
}

export default function EditarPlanoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingPatients, setIsLoadingPatients] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const [formData, setFormData] = useState({
    patient_id: '',
    title: '',
    calories: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'active' as 'active' | 'completed' | 'cancelled',
    observations: ''
  })

  const [meals, setMeals] = useState<Meal[]>([])

  useEffect(() => {
    fetchMealPlan()
    fetchPatients()
  }, [id])

  const fetchMealPlan = async () => {
    try {
      const response = await fetch(`/api/admin/meal-plans/${id}`)
      const data = await response.json()

      if (response.ok) {
        const plan = data.mealPlan
        setMealPlan(plan)
        
        setFormData({
          patient_id: plan.patientId || plan.patient_id,
          title: plan.title,
          calories: plan.planData?.calories?.toString() || plan.plan_data?.calories?.toString() || '',
          description: plan.description || '',
          start_date: plan.startDate || plan.start_date,
          end_date: plan.endDate || plan.end_date || '',
          status: plan.status,
          observations: plan.planData?.observations || plan.plan_data?.observations || ''
        })

        const planData = plan.planData || plan.plan_data;
        if (planData?.meals && Array.isArray(planData.meals)) {
          setMeals(planData.meals.map((meal: any, index: number) => ({
            id: index.toString(),
            name: meal.name || '',
            time: meal.time || '',
            calories: meal.calories || '',
            foods: meal.foods || ''
          })))
        } else {
          setMeals([{ id: '1', name: '', time: '', calories: '', foods: '' }])
        }
      } else {
        toast.error(data.error || 'Erro ao carregar plano')
        router.push('/admin/planos')
      }
    } catch (error) {
      toast.error('Erro ao carregar plano alimentar')
      router.push('/admin/planos')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/admin/patients')
      const data = await response.json()
      
      if (response.ok) {
        setPatients(data.patients || [])
      }
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setIsLoadingPatients(false)
    }
  }

  const addMeal = () => {
    const newMeal: Meal = {
      id: Date.now().toString(),
      name: '',
      time: '',
      calories: '',
      foods: ''
    }
    setMeals([...meals, newMeal])
  }

  const removeMeal = (id: string) => {
    if (meals.length > 1) {
      setMeals(meals.filter(meal => meal.id !== id))
    } else {
      toast.error('É necessário ter pelo menos uma refeição')
    }
  }

  const updateMeal = (id: string, field: keyof Meal, value: string) => {
    setMeals(meals.map(meal => 
      meal.id === id ? { ...meal, [field]: value } : meal
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title) {
      toast.error('Digite o nome do plano')
      return
    }

    if (!formData.calories) {
      toast.error('Digite as calorias diárias')
      return
    }

    if (!formData.start_date) {
      toast.error('Digite a data de início')
      return
    }

    const hasMealWithoutName = meals.some(meal => !meal.name.trim())
    if (hasMealWithoutName) {
      toast.error('Todas as refeições devem ter um nome')
      return
    }

    setIsSubmitting(true)

    try {
      const plan_data = {
        calories: parseInt(formData.calories),
        meals: meals.map(meal => ({
          name: meal.name,
          time: meal.time,
          calories: meal.calories,
          foods: meal.foods
        })),
        observations: formData.observations
      }

      const payload = {
        patient_id: formData.patient_id,
        title: formData.title,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        status: formData.status,
        plan_data
      }

      const response = await fetch(`/api/admin/meal-plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Plano atualizado com sucesso!')
        router.push('/admin/planos')
        router.refresh()
      } else {
        toast.error(data.error || 'Erro ao atualizar plano')
      }
    } catch (error) {
      toast.error('Erro ao atualizar plano alimentar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/meal-plans/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Plano deletado com sucesso!')
        router.push('/admin/planos')
        router.refresh()
      } else {
        toast.error(data.error || 'Erro ao deletar plano')
        setIsDeleting(false)
        setShowDeleteDialog(false)
      }
    } catch (error) {
      toast.error('Erro ao deletar plano alimentar')
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Ativo'
      case 'completed':
        return 'Concluído'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'active':
        return 'default'
      case 'completed':
        return 'secondary'
      case 'cancelled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
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
              <Badge variant={getStatusVariant(formData.status)}>
                {getStatusLabel(formData.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="paciente">Paciente *</Label>
                {isLoadingPatients ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando pacientes...
                  </div>
                ) : (
                  <Select 
                    value={formData.patient_id} 
                    onValueChange={(value) => setFormData({ ...formData, patient_id: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nomePlano">Nome do Plano *</Label>
                  <Input 
                    id="nomePlano" 
                    placeholder="Ex: Plano de Emagrecimento" 
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calorias">Calorias Diárias *</Label>
                  <Input 
                    id="calorias" 
                    type="number" 
                    placeholder="1800" 
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                    disabled={isSubmitting}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Data de Início *</Label>
                  <Input 
                    id="start_date" 
                    type="date" 
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Data de Fim (opcional)</Label>
                  <Input 
                    id="end_date" 
                    type="date" 
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    disabled={isSubmitting}
                    min={formData.start_date}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo do Plano</Label>
                <Textarea 
                  id="objetivo" 
                  placeholder="Descreva o objetivo deste plano alimentar..." 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Refeições</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 bg-transparent"
                    onClick={addMeal}
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar Refeição
                  </Button>
                </div>

                {meals.map((meal) => (
                  <Card key={meal.id} className="border-2">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <Input
                          placeholder="Nome da refeição"
                          value={meal.name}
                          onChange={(e) => updateMeal(meal.id, 'name', e.target.value)}
                          className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                          disabled={isSubmitting}
                          required
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeMeal(meal.id)}
                          disabled={isSubmitting || meals.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Horário</Label>
                          <Input 
                            placeholder="07:00 - 08:00"
                            value={meal.time}
                            onChange={(e) => updateMeal(meal.id, 'time', e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Calorias</Label>
                          <Input 
                            placeholder="350 kcal"
                            value={meal.calories}
                            onChange={(e) => updateMeal(meal.id, 'calories', e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Alimentos</Label>
                        <Textarea 
                          placeholder="Liste os alimentos (um por linha)"
                          rows={4}
                          value={meal.foods}
                          onChange={(e) => updateMeal(meal.id, 'foods', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações Importantes</Label>
                <Textarea 
                  id="observacoes" 
                  placeholder="Dicas, restrições, orientações gerais..." 
                  rows={4}
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                  <Link href="/admin/planos" className="flex-1">
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

                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deletar Plano
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O plano alimentar "{mealPlan?.title}" será permanentemente deletado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
