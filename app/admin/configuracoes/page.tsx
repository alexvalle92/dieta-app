'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

import { AdminNav } from '@/components/admin-nav'
import { Toaster } from 'sonner'

export default function GeneralSettings() {
  const [definition, setDefinition] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) setDefinition(data.settings.dietTechnicalDefinition)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dietTechnicalDefinition: definition })
      })
      if (!res.ok) throw new Error()
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <Toaster richColors position="top-center" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Configurações Gerais</h1>
          <p className="mt-2 text-muted-foreground">Gerencie as definições globais da aplicação</p>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Definição Técnica de Dietas</CardTitle>
              <CardDescription>
                Conteúdo técnico que será utilizado como base para a criação de planos alimentares.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                value={definition}
                onChange={(e) => setDefinition(e.target.value)}
                placeholder="Insira as diretrizes técnicas aqui..."
                className="min-h-[400px] font-mono"
              />
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
