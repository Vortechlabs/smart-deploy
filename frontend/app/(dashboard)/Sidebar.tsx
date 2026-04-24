'use client'

import { useTheme } from '@/components/ThemeProvider'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const OverviewIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="1.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="8.5" y="1.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1.5" y="8.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="8.5" y="8.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

const ProjectsIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <rect x="1.5" y="2" width="12" height="3.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="1.5" y="8" width="7" height="3.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
    <rect x="10.5" y="8" width="3" height="3.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

const DeploymentsIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7.5 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const NewProjectIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M7.5 1.5v1.3M7.5 12.2v1.3M12.5 7.5h-1.3M3.8 7.5H2.5M11 4l-.9.9M4.9 10.1L4 11M11 11l-.9-.9M4.9 4.9L4 4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const LogoutIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <path
      d="M5.5 9.5L2.5 7.5m0 0l3-2M2.5 7.5h6.5m-6.5 3v1a1 1 0 001 1h6.5a1 1 0 001-1v-8a1 1 0 00-1-1h-6.5a1 1 0 00-1 1v1"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

const TechStackIcon = () => (
  <svg className="h-[15px] w-[15px]" viewBox="0 0 15 15" fill="none">
    <rect x="2.5" y="2.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="8.5" y="2.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="2.5" y="8.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="8.5" y="8.5" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

type NavItemProps = {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  badgeColor?: 'blue' | 'red'
  active: boolean
  onClick?: () => void
}

function NavItem({ href, label, icon, badge, badgeColor = 'blue', active, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'flex items-center gap-2.5 rounded-[10px] border px-2.5 py-[7px] text-[13px] transition-all',
        active
          ? 'border-[rgba(64,114,175,0.3)] bg-[#dae2ef] font-medium text-[#4072af] dark:border-[#1e4878] dark:bg-[#1a3558] dark:text-[#7aa8d8]'
          : 'border-transparent text-[#5a7a9e] hover:border-[rgba(64,114,175,0.15)] hover:bg-[#f0f3f8] hover:text-[#102d4d] dark:text-[#7aa0c4] dark:hover:bg-[#1a2e44] dark:hover:text-[#e2eaf4]',
      ].join(' ')}
    >
      <span className={active ? 'opacity-100' : 'opacity-70'}>{icon}</span>
      {label}
      {badge !== undefined && badge > 0 && (
        <span
          className={[
            'ml-auto min-w-[16px] rounded-full px-1.5 py-px text-center text-[10px] font-medium text-white',
            badgeColor === 'red' ? 'bg-red-500' : 'bg-[#4072af] dark:bg-[#5a8fd4]',
          ].join(' ')}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [projectsCount, setProjectsCount] = useState(0)
  const [deploymentsCount, setDeploymentsCount] = useState(0)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🔥 Fetch user data
  const fetchUser = async () => {
    const token = localStorage.getItem('github_token')
    if (!token) return

    try {
      const res = await fetch('http://41.216.191.42:3000/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.user) {
          setUser(data.user)
          localStorage.setItem('user', JSON.stringify(data.user))
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
    }
  }

  // 🔥 Fetch stats
  const fetchStats = async () => {
    const token = localStorage.getItem('github_token')
    if (!token) return

    try {
      const res = await fetch('http://41.216.191.42:3000/projects', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setProjectsCount(data.length)
      let totalDeployments = 0
      data.forEach((project: any) => {
        totalDeployments += project.deployments?.length || 0
      })
      setDeploymentsCount(totalDeployments)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  useEffect(() => {
    fetchUser()
    fetchStats()

    // 🔥 Listen to user update events (dari Settings page)
    const handleUserUpdate = () => {
      fetchUser()
    }

    window.addEventListener('user-updated', handleUserUpdate)
    window.addEventListener('storage', handleUserUpdate)

    return () => {
      window.removeEventListener('user-updated', handleUserUpdate)
      window.removeEventListener('storage', handleUserUpdate)
    }
  }, [])

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }

    closeOnDesktop()
    window.addEventListener('resize', closeOnDesktop)
    return () => window.removeEventListener('resize', closeOnDesktop)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/dashboard') return pathname === '/' || pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const confirmLogout = () => {
    localStorage.removeItem('github_token')
    localStorage.removeItem('user')
    document.cookie = 'github_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/'
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)
  
  // 🔥 Gunakan custom username/email dari settings
  const userLabel = user?.username || user?.email?.split('@')[0] || 'User'
  const userAvatar = user?.avatarUrl

  // 🔥 Logo dinamis berdasarkan theme
  const logoSrc = resolvedTheme === 'dark' ? '/darkLogo.png' : '/lightLogo.png'

  return (
    <>
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-[#dae2ef] bg-white p-6 dark:border-[#1e3a5f] dark:bg-[#0f2035]">
            <h3 className="mb-2 text-lg font-medium text-[#102d4d] dark:text-[#dae2ef]">Logout</h3>
            <p className="mb-6 text-sm text-[#5a7a9e] dark:text-[#7aa0c4]">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 rounded-lg border border-[#dae2ef] px-4 py-2 text-sm font-medium transition-colors hover:bg-[#f0f3f8] dark:border-[#1e3a5f] dark:hover:bg-[#1a2e44]"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="fixed inset-x-4 top-4 z-50 md:hidden">
        <div className="rounded-2xl border border-[rgba(64,114,175,0.15)] bg-white shadow-lg dark:border-[rgba(90,143,212,0.15)] dark:bg-[#142336]">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2.5" onClick={closeMobileMenu}>
              <div className="flex items-center justify-center">
                <img src={logoSrc} alt="Smart Deploy" className="h-10" />
              </div>
            </Link>

            <button
              type="button"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="rounded-xl border border-[rgba(64,114,175,0.15)] p-2 text-[#102d4d] transition-colors hover:bg-[#f0f3f8] dark:border-[rgba(90,143,212,0.15)] dark:text-[#e2eaf4] dark:hover:bg-[#1a2e44]"
            >
              {isMobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close mobile menu"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-[#0f1725]/20 backdrop-blur-[2px]"
          />
          <aside className="absolute inset-x-4 top-20 bottom-4 rounded-2xl border border-[rgba(64,114,175,0.15)] bg-white shadow-lg dark:border-[rgba(90,143,212,0.15)] dark:bg-[#142336]">
            <div className="flex h-full flex-col overflow-hidden">
              <div className="px-3.5 pt-4 pb-2.5">
                <div className="flex items-center justify-center">
                  <img src={logoSrc} alt="Smart Deploy" className="h-14" />
                </div>
              </div>

              <div className="mx-3.5 h-px bg-[rgba(64,114,175,0.12)]" />

              <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pt-2 pb-1">
                <p className="px-2 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-[#5a7a9e]/70 dark:text-[#7aa0c4]/70">
                  Main
                </p>
                <NavItem href="/dashboard" label="Overview" icon={<OverviewIcon />} active={isActive('/dashboard')} onClick={closeMobileMenu} />
                <NavItem href="/projects" label="Projects" icon={<ProjectsIcon />} badge={projectsCount} active={isActive('/projects')} onClick={closeMobileMenu} />
                <NavItem
                  href="/deployments"
                  label="Deployments"
                  icon={<DeploymentsIcon />}
                  badge={deploymentsCount}
                  badgeColor="red"
                  active={isActive('/deployments')}
                  onClick={closeMobileMenu}
                />
                <NavItem href="/projects/new" label="New Project" icon={<NewProjectIcon />} active={isActive('/projects/new')} onClick={closeMobileMenu} />

                <div className="my-2 h-px bg-[rgba(64,114,175,0.12)]" />

                <p className="px-2 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-[#5a7a9e]/70 dark:text-[#7aa0c4]/70">
                  Config
                </p>
                <NavItem href="/settings" label="Settings" icon={<SettingsIcon />} active={isActive('/settings')} onClick={closeMobileMenu} />
                <NavItem href="/tech-stack" label="Tech Stack" icon={<TechStackIcon />} active={isActive('/tech-stack')} onClick={closeMobileMenu} />
              </nav>

              {/* User Profile */}
              <div className="px-2 pb-3">
                <div className="flex items-center gap-2.5 rounded-[10px] border border-[rgba(64,114,175,0.15)] bg-[#f0f3f8] px-2.5 py-2 dark:border-[rgba(90,143,212,0.15)] dark:bg-[#1a2e44]">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] overflow-hidden">
                    {userAvatar ? (
                      <img src={userAvatar} alt={userLabel} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[#dae2ef] dark:bg-[#102d4d] flex items-center justify-center text-[11px] font-medium text-[#4072af] dark:text-[#7aa8d8]">
                        {userLabel?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium leading-none text-[#102d4d] dark:text-[#e2eaf4]">{userLabel}</p>
                    <p className="mt-0.5 text-[10px] leading-none text-[#5a7a9e] dark:text-[#7aa0c4]">Active</p>
                  </div>
                  <button
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="rounded p-1 transition-colors hover:bg-[#dae2ef] dark:hover:bg-[#102d4d]"
                    title="Logout"
                  >
                    <LogoutIcon />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed left-4 top-4 bottom-4 z-40 hidden w-56 rounded-2xl border border-[rgba(64,114,175,0.15)] bg-white shadow-lg dark:border-[rgba(90,143,212,0.15)] dark:bg-[#142336] md:block">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="px-3.5 pt-4 pb-2.5">
            <Link href="/" className="flex items-center justify-center">
              <img src={logoSrc} alt="Smart Deploy" className="h-14" />
            </Link>
          </div>

          <div className="mx-3.5 h-px bg-[rgba(64,114,175,0.12)]" />

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pt-2 pb-1">
            <p className="px-2 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-[#5a7a9e]/70 dark:text-[#7aa0c4]/70">
              Main
            </p>
            <NavItem href="/dashboard" label="Overview" icon={<OverviewIcon />} active={isActive('/dashboard')} />
            <NavItem href="/projects" label="Projects" icon={<ProjectsIcon />} badge={projectsCount} active={isActive('/projects')} />
            <NavItem
              href="/deployments"
              label="Deployments"
              icon={<DeploymentsIcon />}
              badge={deploymentsCount}
              badgeColor="red"
              active={isActive('/deployments')}
            />
            <NavItem href="/projects/new" label="New Project" icon={<NewProjectIcon />} active={isActive('/projects/new')} />

            <div className="my-2 h-px bg-[rgba(64,114,175,0.12)]" />

            <p className="px-2 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-widest text-[#5a7a9e]/70 dark:text-[#7aa0c4]/70">
              Config
            </p>
            <NavItem href="/settings" label="Settings" icon={<SettingsIcon />} active={isActive('/settings')} />
            <NavItem href="/tech-stack" label="Tech Stack" icon={<TechStackIcon />} active={isActive('/tech-stack')} />
          </nav>

          {/* User Profile */}
          <div className="px-2 pb-3">
            <div className="flex items-center gap-2.5 rounded-[10px] border border-[rgba(64,114,175,0.15)] bg-[#f0f3f8] px-2.5 py-2 dark:border-[rgba(90,143,212,0.15)] dark:bg-[#1a2e44]">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] overflow-hidden">
                {userAvatar ? (
                  <img src={userAvatar} alt={userLabel} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[#dae2ef] dark:bg-[#102d4d] flex items-center justify-center text-[11px] font-medium text-[#4072af] dark:text-[#7aa8d8]">
                    {userLabel?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium leading-none text-[#102d4d] dark:text-[#e2eaf4]">{userLabel}</p>
                <p className="mt-0.5 text-[10px] leading-none text-[#5a7a9e] dark:text-[#7aa0c4]">Active</p>
              </div>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                className="rounded p-1 transition-colors hover:bg-[#dae2ef] dark:hover:bg-[#102d4d]"
                title="Logout"
              >
                <LogoutIcon />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}