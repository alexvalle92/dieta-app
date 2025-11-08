"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export function SearchPatients() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      
      if (value) {
        params.set('search', value)
      } else {
        params.delete('search')
      }
      
      router.push(`/admin/pacientes?${params.toString()}`)
    })
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, email ou CPF..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={isPending}
          />
        </div>
      </CardContent>
    </Card>
  )
}
