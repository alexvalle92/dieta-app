"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BookOpen, Home, Utensils } from "lucide-react"
import { UserMenu } from "@/components/user-menu"
import { activeTab, type ClientTab } from "@/lib/client/nav"

const NAV_ITEMS: ReadonlyArray<{ tab: ClientTab; href: string; label: string; icon: typeof Home }> = [
  { tab: "inicio", href: "/cliente/dashboard", label: "Início", icon: Home },
  { tab: "plano", href: "/cliente/meu-plano", label: "Meu Plano", icon: Utensils },
  { tab: "receitas", href: "/cliente/receitas", label: "Receitas", icon: BookOpen },
]

/**
 * Moldura das telas do paciente: topo com logo e avatar e, no celular, o menu inferior com o plano
 * no centro. No `md+` as mesmas opções ficam no topo. Nenhuma das barras sai na impressão.
 */
export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const current = activeTab(pathname)
  const [userData, setUserData] = useState<{ name: string; email?: string } | null>(null)

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserData({ name: data.user.name || "Usuário", email: data.user.email })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 print:pb-0">
      <header className="print:hidden border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-16 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/cliente/dashboard" className="flex items-center">
              <Image src="/LogoPlanA.png" alt="Plana" width={120} height={40} className="h-8 w-auto md:h-10" />
            </Link>
            <nav aria-label="Navegação principal" className="hidden gap-2 md:flex">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = current === item.tab
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
          {userData && (
            <UserMenu userName={userData.name} userEmail={userData.email} userType="patient" showMyDataLink />
          )}
        </div>
      </header>

      {children}

      <nav
        aria-label="Navegação principal"
        className="print:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = current === item.tab
            const color = isActive ? "text-primary" : "text-muted-foreground"

            if (item.tab === "plano") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className="flex min-h-11 flex-col items-center justify-end gap-1 pb-2"
                >
                  <span
                    className={`-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card ${
                      isActive ? "" : "opacity-90"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={`text-xs font-medium ${color}`}>{item.label}</span>
                </Link>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-1 ${color}`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
