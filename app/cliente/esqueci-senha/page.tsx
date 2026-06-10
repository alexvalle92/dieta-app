'use client'

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toaster } from "sonner"
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react"

export default function EsqueciSenhaPage() {
  const [cpf, setCpf] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

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

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setCpf(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const cpfNumbers = cpf.replace(/\D/g, '')
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfNumbers }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Erro ao processar solicitação")
        return
      }

      setEmail(data.email)
      setShowSuccess(true)
      toast.success('Link de recuperação enviado!')
    } catch (error) {
      toast.error("Ocorreu um erro ao processar sua solicitação. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Link de Recuperação Enviado!</CardTitle>
            <CardDescription>
              Verifique seu e-mail para redefinir sua senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="h-5 w-5" />
                <span>Enviado para:</span>
              </div>
              <p className="mt-2 font-medium text-foreground">{email}</p>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Caso não encontre o e-mail, verifique também sua caixa de spam ou lixo eletrônico.
            </p>

            <div className="pt-4 border-t">
              <Link href="/cliente/login">
                <Button variant="ghost" className="w-full gap-2" type="button">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para o login
                </Button>
              </Link>
            </div>

            <Toaster richColors position="top-center" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <Image src="/LogoPlanA.png" alt="Plana" width={180} height={60} className="h-16 w-auto" />
          </div>
          <CardTitle className="text-2xl">Esqueci Minha Senha</CardTitle>
          <CardDescription>
            Digite seu CPF para receber um link de recuperação de senha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCPFChange}
                maxLength={14}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Digite o CPF cadastrado no sistema
              </p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </Button>

            <Link href="/cliente/login">
              <Button variant="ghost" className="w-full gap-2" type="button">
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Button>
            </Link>

            <Toaster richColors position="top-center" />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
