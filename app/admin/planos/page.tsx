'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, User, Edit, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Pagination } from "@/components/pagination"

const ITEMS_PER_PAGE = 10

interface MealPlan {
  id: string
  patient_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string | null
  status: 'active' | 'completed' | 'cancelled'
  plan_data: any
  created_at: string
  updated_at: string
  patient: {
    id: string
    name: string
    email: string
    cpf: string
  }
}

export default function PlanosAdminPage() {
  const [planos, setPlanos] = useState<MealPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async (search?: string) => {
    try {
      setIsLoading(true)
      const url = search 
        ? `/api/admin/meal-plans?search=${encodeURIComponent(search)}`
        : '/api/admin/meal-plans'
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setPlanos(data.mealPlans || [])
      } else {
        toast.error(data.error || 'Erro ao carregar planos')
      }
    } catch (error) {
      toast.error('Erro ao carregar planos alimentares')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    if (value.trim()) {
      fetchPlans(value.trim())
    } else {
      fetchPlans()
    }
  }

  const totalPages = Math.ceil(planos.length / ITEMS_PER_PAGE)
  const paginatedPlanos = planos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

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

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR })
    } catch {
      return dateString
    }
  }

  const getCalories = (planData: any) => {
    if (planData && planData.calories) {
      return `${planData.calories} kcal/dia`
    }
    return 'Não especificado'
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Planos</h1>
            <p className="mt-2 text-muted-foreground">Cadastre e edite planos alimentares dos pacientes</p>
          </div>
          <Link href="/admin/planos/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por paciente ou nome do plano..." 
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
        ) : planos.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Nenhum plano encontrado para sua busca.' 
                    : 'Nenhum plano alimentar cadastrado ainda.'}
                </p>
                {!searchTerm && (
                  <Link href="/admin/planos/novo">
                    <Button className="mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      Criar Primeiro Plano
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6">
              {paginatedPlanos.map((plano) => (
                <Card key={plano.id} className="transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl">{plano.title}</CardTitle>
                          <Badge variant={getStatusVariant(plano.status)}>
                            {getStatusLabel(plano.status)}
                          </Badge>
                        </div>
                        <CardDescription className="mt-2">
                          {getCalories(plano.plan_data)} • Criado em {formatDate(plano.created_at)}
                        </CardDescription>
                      </div>
                      <Link href={`/admin/planos/${plano.id}/editar`}>
                        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">Paciente: {plano.patient.name}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </main>
    </div>
  )
}
