'use client'

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Toaster } from "sonner"
import { ArrowLeft, CheckCircle2, Copy } from "lucide-react"

export default function EsqueciSenhaPage() {
  const [cpf, setCpf] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [resetLink, setResetLink] = useState('')
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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(resetLink)
      toast.success('Link copiado para a área de transferência!')
    } catch {
      toast.error('Erro ao copiar link')
    }
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
        toast.error(data.error || "CPF não encontrado")
        return
      }

      setResetLink(data.resetLink)
      setShowSuccess(true)
      toast.success('Link de recuperação gerado com sucesso!')
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
            <CardTitle className="text-2xl">Link de Recuperação Gerado!</CardTitle>
            <CardDescription>
              Use o link abaixo para redefinir sua senha
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Link de Recuperação</Label>
              <div className="flex gap-2">
                <Input
                  value={resetLink}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="flex-shrink-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 1 hora. Copie e cole no navegador ou clique no botão abaixo.
              </p>
            </div>

            <Button 
              asChild 
              className="w-full" 
              size="lg"
            >
              <a href={resetLink}>Acessar Link de Recuperação</a>
            </Button>

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
        <CardHeader className="space-y-1">
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
              {isLoading ? 'Gerando link...' : 'Gerar Link de Recuperação'}
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
