'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Loader2 } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cpf: '',
    phone: '',
    crn: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const response = await fetch('/api/setup/check')
      const data = await response.json()
      if (data.hasAdmin) {
        setHasAdmin(true)
        router.push('/admin/login')
      }
    } catch (err) {
      console.error('Error checking admin:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar administrador')
      }

      setSuccess('Administrador criado com sucesso! Criando pacientes fictícios...')
      
      setSeeding(true)
      const seedResponse = await fetch('/api/setup/seed', { method: 'POST' })
      const seedData = await seedResponse.json()

      if (!seedResponse.ok) {
        setSeeding(false)
        throw new Error(`Erro ao criar pacientes: ${seedData.error}`)
      }

      setSuccess(`Administrador e ${seedData.patients?.length || 5} pacientes criados com sucesso! Redirecionando...`)

      setTimeout(() => {
        router.push('/admin/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar administrador')
    } finally {
      setSubmitting(false)
      setSeeding(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (hasAdmin) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Configuração Inicial</CardTitle>
          <CardDescription>
            Crie o primeiro administrador do sistema (Nutricionista)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Dra. Maria Silva"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="maria@nutriplan.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crn">CRN (Registro Profissional) *</Label>
                <Input
                  id="crn"
                  name="crn"
                  type="text"
                  placeholder="CRN-1 12345"
                  value={formData.crn}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
                {success}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={submitting || seeding}
            >
              {submitting || seeding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {seeding ? 'Criando pacientes...' : 'Criando administrador...'}
                </>
              ) : (
                'Criar Administrador e Inicializar Sistema'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              * Todos os campos são obrigatórios
              <br />
              Ao criar o administrador, 5 pacientes fictícios serão adicionados para testes.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
