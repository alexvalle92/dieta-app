export const dynamic = 'force-dynamic'

import { ClientNav } from "@/components/client-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/server/db"
import { patients } from "@/shared/schema"
import { eq } from "drizzle-orm"
import { Mail, Phone, Calendar, User, Hash } from "lucide-react"

export default async function MeusDadosPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/cliente/login')
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, session.userId))
    .limit(1)

  if (!patient) {
    redirect('/cliente/dashboard')
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
      <ClientNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meus Dados</h1>
          <p className="mt-2 text-muted-foreground">
            Confira suas informações cadastrais e dados pessoais
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Seus dados cadastrados na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Nome Completo</span>
                </div>
                <p className="text-base font-medium text-foreground">
                  {patient.name || 'Não informado'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>E-mail</span>
                </div>
                <p className="text-base font-medium text-foreground">
                  {patient.email || 'Não informado'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  <span>CPF</span>
                </div>
                <p className="text-base font-medium text-foreground">
                  {formatCPF(patient.cpf)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>Telefone</span>
                </div>
                <p className="text-base font-medium text-foreground">
                  {formatPhone(patient.phone)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data de Cadastro</span>
                </div>
                <p className="text-base font-medium text-foreground">
                  {formatDate(patient.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
