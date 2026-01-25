"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "sonner";

export default function ClientLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const isEmail = (value: string) => {
    return value.includes("@");
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const hasLetters = /[a-zA-Z@]/.test(value);
    if (hasLetters) {
      setIdentifier(value);
    } else {
      const formatted = formatCPF(value);
      setIdentifier(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const isEmailLogin = isEmail(identifier);
      const loginData = isEmailLogin
        ? { email: identifier, password }
        : { cpf: identifier.replace(/\D/g, ""), password };

      const response = await fetch("/api/auth/login-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "CPF/Email ou senha inválidos");
        return;
      }

      router.push(
        "/cliente/dashboard?login=success&name=" +
          encodeURIComponent(data.user.name),
      );
    } catch (error) {
      toast.error("Ocorreu um erro ao processar seu login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <Image src="/LogoPlanA.png" alt="Plana" width={225} height={139} />
          </div>
          <CardDescription>
            Entre com suas credenciais para acessar seus planos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">CPF ou E-mail</Label>
              <Input
                id="identifier"
                placeholder="000.000.000-00 ou email@exemplo.com"
                value={identifier}
                onChange={handleIdentifierChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link
                href="/cliente/esqueci-senha"
                className="text-primary hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
            <div className="text-center pt-2">
              <Button
                variant="link"
                className="text-muted-foreground font-normal hover:text-primary"
                onClick={() => window.open('https://nutritamilivalle.com.br', '_blank')}
                type="button"
              >
                Ainda não tem uma conta?
              </Button>
            </div>
            <Toaster richColors position="top-center" />
            <div className="text-center text-sm text-muted-foreground">
              <Link href="/" className="hover:text-primary hover:underline">
                Voltar para início
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
