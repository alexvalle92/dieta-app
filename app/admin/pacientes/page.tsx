'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Edit, Plus, Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { DeletePatientButton } from "@/components/delete-patient-button"
import { Toaster, toast } from "sonner"
import { Pagination } from "@/components/pagination"

const ITEMS_PER_PAGE = 10

interface Patient {
  id: string
  name: string
  email: string
  cpf: string
  phone: string
  createdAt: string
}

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchPatients()
  }, [])

  const fetchPatients = async (search?: string) => {
    try {
      setIsLoading(true)
      const url = search 
        ? `/api/admin/patients?search=${encodeURIComponent(search)}`
        : '/api/admin/patients'
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setPacientes(data.patients || [])
      } else {
        toast.error(data.error || 'Erro ao carregar pacientes')
      }
    } catch (error) {
      toast.error('Erro ao carregar pacientes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    if (value.trim()) {
      fetchPatients(value.trim())
    } else {
      fetchPatients()
    }
  }

  const formatCPF = (cpf: string) => {
    if (!cpf) return 'Não informado'
    const numbers = cpf.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }
    return cpf
  }

  const formatPhone = (phone: string) => {
    if (!phone) return 'Não informado'
    const numbers = phone.replace(/\D/g, '')
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }
    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return phone
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado'
    try {
      return new Date(dateString).toLocaleDateString('pt-BR')
    } catch {
      return dateString
    }
  }

  const totalPages = Math.ceil(pacientes.length / ITEMS_PER_PAGE)
  const paginatedPacientes = pacientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciar Pacientes</h1>
            <p className="mt-2 text-muted-foreground">Cadastre e gerencie os pacientes da plataforma</p>
          </div>
          <Link href="/admin/pacientes/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Paciente
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, email ou CPF..." 
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
        ) : pacientes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Nenhum paciente encontrado para sua busca.' 
                  : 'Nenhum paciente cadastrado ainda.'}
              </p>
              {!searchTerm && (
                <Link href="/admin/pacientes/novo">
                  <Button className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Cadastrar Primeiro Paciente
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6">
              {paginatedPacientes.map((paciente) => (
                <Card key={paciente.id} className="transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-xl">{paciente.name}</CardTitle>
                          <Badge variant="default">Ativo</Badge>
                        </div>
                        <CardDescription className="mt-2">
                          CPF: {formatCPF(paciente.cpf)} • Cadastrado em {formatDate(paciente.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/pacientes/${paciente.id}/editar`}>
                          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                            <Edit className="h-4 w-4" />
                            Editar
                          </Button>
                        </Link>
                        <DeletePatientButton 
                          patientId={paciente.id} 
                          patientName={paciente.name}
                          onDelete={() => fetchPatients(searchTerm)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{paciente.email || 'Não informado'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{formatPhone(paciente.phone)}</span>
                      </div>
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
