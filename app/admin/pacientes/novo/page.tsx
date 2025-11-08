import { AdminNav } from "@/components/admin-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PatientForm } from "@/components/patient-form"

export default async function NovoPacientePage() {
  const session = await getSession()
  
  if (!session || session.userType !== 'admin') {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin/pacientes">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para Pacientes
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Cadastrar Novo Paciente</CardTitle>
            <CardDescription>Preencha os dados do paciente abaixo</CardDescription>
          </CardHeader>
          <CardContent>
            <PatientForm mode="create" />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
