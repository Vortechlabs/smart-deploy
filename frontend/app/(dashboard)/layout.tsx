'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return null
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  useEffect(() => {
    const checkAuth = async () => {
      let token = getCookie('github_token')
      if (!token) {
        token = localStorage.getItem('github_token')
      }
      
      if (!token) {
        router.push('/')
        setIsLoading(false)
        return
      }
      
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (res.ok) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem('github_token')
          document.cookie = 'github_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          router.push('/')
        }
      } catch (err) {
        console.error("Auth check error:", err)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router])
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return null
  }
  
return (
  <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
    <Sidebar />
    <main className="flex-1 pt-16 md:pt-0 lg:ml-64 md:ml-20 transition-all duration-200">
      <div className="p-6">
        {children}
      </div>
    </main>
  </div>
)
}
