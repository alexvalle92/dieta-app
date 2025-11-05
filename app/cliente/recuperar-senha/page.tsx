import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export default function RecuperarSenhaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>Digite seu e-mail para receber instruções de recuperação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" />
          </div>
          <Button className="w-full" size="lg">
            Enviar Instruções
          </Button>
          <Link href="/cliente/login">
            <Button variant="ghost" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
