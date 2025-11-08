"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"

interface PatientFormProps {
  patient?: {
    id: string
    name: string
    email: string
    cpf: string
    phone?: string
  }
  mode: 'create' | 'edit'
}

export function PatientForm({ patient, mode }: PatientFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: patient?.name || '',
    email: patient?.email || '',
    cpf: patient?.cpf || '',
    phone: patient?.phone || '',
    password: '',
  })

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return value
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return value
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (mode === 'create' && !formData.password) {
        toast.error('Senha é obrigatória para novos pacientes')
        setIsLoading(false)
        return
      }

      const url = mode === 'create' 
        ? '/api/admin/patients' 
        : `/api/admin/patients/${patient?.id}`
      
      const method = mode === 'create' ? 'POST' : 'PUT'
      
      const payload = mode === 'create'
        ? formData
        : { name: formData.name, email: formData.email, phone: formData.phone }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erro ao salvar paciente')
        return
      }

      toast.success(mode === 'create' ? 'Paciente cadastrado com sucesso!' : 'Paciente atualizado com sucesso!')
      router.push('/admin/pacientes')
      router.refresh()
    } catch (error) {
      toast.error('Erro ao processar requisição')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo *</Label>
          <Input 
            id="nome" 
            placeholder="Nome do paciente"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF *</Label>
          <Input 
            id="cpf" 
            placeholder="000.000.000-00"
            value={formatCPF(formData.cpf)}
            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
            maxLength={14}
            required
            disabled={isLoading || mode === 'edit'}
          />
          {mode === 'edit' && (
            <p className="text-xs text-muted-foreground">CPF não pode ser alterado</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="email@exemplo.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input 
            id="telefone" 
            placeholder="(00) 00000-0000"
            value={formatPhone(formData.phone)}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            maxLength={15}
            disabled={isLoading}
          />
        </div>
      </div>

      {mode === 'create' && (
        <div className="space-y-2">
          <Label htmlFor="senha">Senha Temporária *</Label>
          <Input 
            id="senha" 
            type="password" 
            placeholder="Senha para primeiro acesso"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            disabled={isLoading}
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            O paciente poderá alterar a senha após o primeiro acesso. Mínimo de 6 caracteres.
          </p>
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading ? 'Salvando...' : mode === 'create' ? 'Cadastrar Paciente' : 'Atualizar Paciente'}
        </Button>
        <Link href="/admin/pacientes" className="flex-1">
          <Button type="button" variant="outline" className="w-full bg-transparent" disabled={isLoading}>
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  )
}
