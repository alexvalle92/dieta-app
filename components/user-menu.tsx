"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { LogOut, User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface UserMenuProps {
  userName: string
  userEmail?: string
  userType: 'patient' | 'admin'
  showMyDataLink?: boolean
}

export function UserMenu({ userName, userEmail, userType, showMyDataLink = false }: UserMenuProps) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      
      if (response.ok) {
        toast.success("Logout realizado com sucesso!")
        const redirectUrl = userType === 'admin' ? '/admin/login' : '/cliente/login'
        router.push(redirectUrl)
        router.refresh()
      } else {
        toast.error("Erro ao fazer logout")
      }
    } catch (error) {
      toast.error("Erro ao fazer logout")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleMyData = () => {
    if (userType === 'patient') {
      router.push('/cliente/meus-dados')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            {userEmail && (
              <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {showMyDataLink && (
          <>
            <DropdownMenuItem onClick={handleMyData}>
              <User className="mr-2 h-4 w-4" />
              <span>Meus Dados</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
