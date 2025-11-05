import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            <span className="text-primary">NutriPlan</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Planos alimentares personalizados para seu emagrecimento saudável
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <Card className="border-2 transition-all hover:border-primary hover:shadow-lg">
            <CardHeader>
              <CardTitle>Área do Cliente</CardTitle>
              <CardDescription>Acesse seus planos alimentares e receitas</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/cliente/login">
                <Button className="w-full" size="lg">
                  Entrar como Cliente
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-2 transition-all hover:border-secondary hover:shadow-lg">
            <CardHeader>
              <CardTitle>Área Administrativa</CardTitle>
              <CardDescription>Gerencie pacientes e planos alimentares</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/login">
                <Button className="w-full" variant="secondary" size="lg">
                  Entrar como Admin
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
