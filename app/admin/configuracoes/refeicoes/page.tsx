'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from '@/components/admin-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Toaster } from 'sonner'

interface MealCategory {
  id: string
  name: string
}

export default function MealCategoriesSettings() {
  const [categories, setCategories] = useState<MealCategory[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/meal-categories')
      const data = await res.json()
      if (data.categories) setCategories(data.categories)
    } catch (error) {
      toast.error('Erro ao carregar refeições')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setAdding(true)
    try {
      const res = await fetch('/api/admin/meal-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() })
      })
      if (!res.ok) throw new Error()
      setNewName('')
      fetchCategories()
      toast.success('Refeição adicionada!')
    } catch (error) {
      toast.error('Erro ao adicionar refeição')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/meal-categories/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error()
      setCategories(categories.filter(c => c.id !== id))
      toast.success('Refeição excluída!')
    } catch (error) {
      toast.error('Erro ao excluir refeição')
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
            <h1 className="text-3xl font-bold text-foreground">Tipos de Refeição</h1>
            <p className="mt-2 text-muted-foreground">Gerencie a lista de horários de refeição</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Nova Refeição</CardTitle>
              <CardDescription>Insira o nome da refeição (ex: Almoço, Café da Manhã)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome da refeição..."
                  disabled={adding}
                />
                <Button type="submit" disabled={adding || !newName.trim()}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Refeições Cadastradas</CardTitle>
              <CardDescription>Lista de tipos de refeição ativos na aplicação</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhuma refeição cadastrada.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {categories.map((category) => (
                    <li key={category.id} className="flex items-center justify-between py-3">
                      <span className="font-medium">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
