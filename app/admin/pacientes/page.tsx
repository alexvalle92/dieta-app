import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, Edit, Plus } from "lucide-react"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/server/db"
import { patients } from "@/shared/schema"
import { desc, or, ilike } from "drizzle-orm"
import { SearchPatients } from "@/components/search-patients"
import { DeletePatientButton } from "@/components/delete-patient-button"
import { Toaster } from "sonner"

export default async function PacientesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ search?: string }> 
}) {
  const session = await getSession()
  
  if (!session || session.userType !== 'admin') {
    redirect('/admin/login')
  }

  const params = await searchParams
  const rawSearch = params.search || ''
  const search = rawSearch.trim().replace(/[%_]/g, '')

  let pacientes;
  
  if (search.length > 0) {
    pacientes = await db
      .select({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        phone: patients.phone,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .where(
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.email, `%${search}%`),
          ilike(patients.cpf, `%${search}%`)
        )
      )
      .orderBy(desc(patients.createdAt))
  } else {
    pacientes = await db
      .select({
        id: patients.id,
        name: patients.name,
        email: patients.email,
        cpf: patients.cpf,
        phone: patients.phone,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .orderBy(desc(patients.createdAt))
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

  const formatDate = (dateString: Date | null) => {
    if (!dateString) return 'Não informado'
    return dateString.toLocaleDateString('pt-BR')
  }

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

        <SearchPatients />

        {pacientes && pacientes.length > 0 ? (
          <div className="grid gap-6">
            {pacientes.map((paciente) => (
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
                      <DeletePatientButton patientId={paciente.id} patientName={paciente.name} />
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
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum paciente cadastrado ainda.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
