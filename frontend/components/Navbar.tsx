'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import LogoutConfirmModal from './LogoutConfirmModal'
import { useTheme } from './ThemeProvider'

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift()
  return null
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // 🔥 Fetch user function (reusable)
  const fetchUser = async () => {
    let token = getCookie('github_token')
    if (!token) {
      token = localStorage.getItem('github_token')
    }
    
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    
try {
      // 1. Ambil base URL-nya dulu biar bersih
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      
      // 2. Pake BACKTICK ( ` ) di sini, bukan kutip satu!
      const res = await fetch(`${apiBase}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        localStorage.setItem('github_token', token)
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        localStorage.removeItem('github_token')
        localStorage.removeItem('user')
        document.cookie = 'github_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        setUser(null)
      }
    } catch (err) {
      console.error("Auth check error:", err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient) return
    fetchUser()
    
    const handleUserUpdate = () => fetchUser()
    window.addEventListener('user-updated', handleUserUpdate)
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'github_token' || e.key === 'user') {
        fetchUser()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('user-updated', handleUserUpdate)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [isClient])
  
  // 🔥 Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])
  
const handleLogin = () => {
  // Ambil dari variabel env
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const callbackUrl = process.env.NEXT_PUBLIC_CALLBACK_URL;

  // Cek dulu, kalo env kosong berarti ada yang salah sama file .env lu
  if (!clientId || !callbackUrl) {
    console.error("Env missing! Cek file .env.local lu Bra.");
    return;
  }

  // Bungkus pake BACKTICK ( ` ), jangan kutip satu atau dua
  window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo,user`;
};
  
  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true)
    setIsMobileMenuOpen(false)
  }
  
  const handleLogoutConfirm = () => {
    localStorage.removeItem('github_token')
    localStorage.removeItem('user')
    document.cookie = 'github_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setUser(null)
    setIsLogoutModalOpen(false)
    
    router.push('/')
    router.refresh()
    
    setTimeout(() => {
      window.location.href = '/'
    }, 100)
  }
  
  const handleLogoutCancel = () => {
    setIsLogoutModalOpen(false)
  }

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }
  
  if (!isClient || loading) {
    return (
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400" />
            </div>
            <div className="w-20 h-8 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg"></div>
          </div>
        </div>
      </nav>
    )
  }

  const logoSrc = resolvedTheme === 'dark' ? '/darkLogo.png' : '/lightLogo.png'
  const userAvatar = user?.avatarUrl
  const userLabel = user?.username || user?.email?.split('@')[0] || 'User'
  
  return (
    <>
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
      
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-2 sm:py-3">
          <div className="flex justify-between items-center">
            {/* Logo - Tanpa teks di mobile */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={logoSrc} alt="Smart Deploy" className="h-10 sm:h-12 w-auto" />
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle resolvedTheme={resolvedTheme} toggleTheme={toggleTheme} />
              
              {user && (
                <>
                  <NavLink href="/projects" pathname={pathname}>Projects</NavLink>
                  <NavLink href="/settings" pathname={pathname}>Settings</NavLink>
                </>
              )}
              
              {user ? (
                <DesktopUserMenu 
                  user={user} 
                  userAvatar={userAvatar} 
                  userLabel={userLabel} 
                  onLogout={handleLogoutClick} 
                />
              ) : (
                <SignInButton onClick={handleLogin} />
              )}
            </div>
            
            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle resolvedTheme={resolvedTheme} toggleTheme={toggleTheme} />
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-3 py-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
              {user ? (
                <>
                  <MobileNavLink href="/projects" pathname={pathname}>Projects</MobileNavLink>
                  <MobileNavLink href="/settings" pathname={pathname}>Settings</MobileNavLink>
                  
                  <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 px-2 py-2">
                      {userAvatar ? (
                        <img src={userAvatar} alt={userLabel} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">
                            {userLabel[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{userLabel}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={handleLogoutClick}
                      className="w-full mt-2 text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-2 py-2">
                  <SignInButton onClick={handleLogin} />
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

// 🔥 Sub-components
function ThemeToggle({ resolvedTheme, toggleTheme }: { resolvedTheme: string; toggleTheme: () => void }) {
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 2v2M12 20v2M4 12H2M6 6L4 4M18 6l2-2M20 12h2M6 18l-2 2M18 18l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="currentColor" />
        </svg>
      )}
    </button>
  )
}

function NavLink({ href, pathname, children }: { href: string; pathname: string | null; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`text-sm font-medium transition-colors ${
        pathname?.startsWith(href)
          ? 'text-blue-600 dark:text-blue-400' 
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ href, pathname, children }: { href: string; pathname: string | null; children: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        pathname?.startsWith(href)
          ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  )
}

function DesktopUserMenu({ user, userAvatar, userLabel, onLogout }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {userAvatar ? (
          <img src={userAvatar} alt={userLabel} className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {userLabel[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
        <span className="text-sm text-gray-700 dark:text-gray-300 hidden lg:block">
          {userLabel}
        </span>
      </div>
      
      <button 
        onClick={onLogout}
        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 transition-all"
      >
        Logout
      </button>
    </div>
  )
}

function SignInButton({ onClick }: { onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-md"
    >
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.42c-2.23.48-2.7-1.08-2.7-1.08-.36-.92-.89-1.16-.89-1.16-.73-.5.05-.49.05-.49.81.05 1.24.84 1.24.84.72 1.23 1.89.88 2.35.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z" />
      </svg>
      Sign In
    </button>
  )
}