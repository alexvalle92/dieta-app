import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ClientLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">NutriPlan</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar seus planos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <Link href="/cliente/recuperar-senha" className="text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <Button className="w-full" size="lg">
            Entrar
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary hover:underline">
              Voltar para início
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
