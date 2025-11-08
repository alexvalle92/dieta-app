"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Home, BookOpen, FileText } from "lucide-react"
import { UserMenu } from "@/components/user-menu"

export function ClientNav() {
  const pathname = usePathname()
  const [userData, setUserData] = useState<{ name: string; email?: string } | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUserData({ name: data.user.name || 'Usuário', email: data.user.email })
        }
      })
      .catch(() => {})
  }, [])

  const navItems = [
    { href: "/cliente/dashboard", label: "Início", icon: Home },
    { href: "/cliente/planos", label: "Meus Planos", icon: FileText },
    { href: "/cliente/receitas", label: "Receitas", icon: BookOpen },
  ]

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/cliente/dashboard" className="text-xl font-bold text-primary">
              NutriPlan
            </Link>
            <div className="hidden md:flex md:gap-4">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
            </div>
          </div>
          {userData && (
            <UserMenu 
              userName={userData.name} 
              userEmail={userData.email}
              userType="patient"
              showMyDataLink={true}
            />
          )}
        </div>
      </div>
    </nav>
  )
}
