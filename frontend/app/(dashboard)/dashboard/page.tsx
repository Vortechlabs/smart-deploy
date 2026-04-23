'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

// ─── Mini sparkline ───────────────────────────────────────────────
function Spark({ values, color }: { values: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c || values.length < 2) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const dpr = devicePixelRatio || 1
    c.width = c.offsetWidth * dpr
    c.height = c.offsetHeight * dpr
    ctx.scale(dpr, dpr)
    const W = c.offsetWidth, H = c.offsetHeight
    const max = Math.max(...values, 1)
    const pts = values.map((v, i) => ({
      x: (i / (values.length - 1)) * W,
      y: H - (v / max) * (H - 4) - 2,
    }))
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, color + '55')
    grad.addColorStop(1, color + '00')
    ctx.clearRect(0, 0, W, H)
    ctx.beginPath()
    ctx.moveTo(pts[0].x, H)
    ctx.lineTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2
      const my = (pts[i - 1].y + pts[i].y) / 2
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.lineTo(pts[pts.length - 1].x, H)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1].x + pts[i].x) / 2
      const my = (pts[i - 1].y + pts[i].y) / 2
      ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, mx, my)
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.strokeStyle = color
    ctx.lineWidth = 1.6
    ctx.stroke()
  }, [values, color])
  return <canvas ref={ref} className="w-full h-full" />
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running:  'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
    building: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
    failed:   'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800',
    pending:  'text-[#4072af] bg-[#dae2ef] border-[#b3c8e3] dark:text-[#7aa8d8] dark:bg-[#102d4d]/60 dark:border-[#1e4878]',
  }
  const pulse = status === 'running' || status === 'building'
  const cls = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function OverviewPage() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalDeployments: 0,
    runningDeployments: 0,
    failedDeployments: 0,
  })
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [recentDeployments, setRecentDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fake sparkline seeds (visual only, no logic change)
  const sparkSeeds = useRef({
    projects:     Array.from({ length: 12 }, (_, i) => Math.round(2 + Math.sin(i * 0.8) * 1.5 + i * 0.3)),
    deployments:  Array.from({ length: 12 }, (_, i) => Math.round(5 + Math.cos(i * 0.6) * 3 + i * 0.5)),
    running:      Array.from({ length: 12 }, (_, i) => Math.round(1 + Math.sin(i * 1.1) * 1 + i * 0.2)),
    failed:       Array.from({ length: 12 }, (_, i) => Math.round(Math.abs(Math.sin(i * 1.4)) * 2)),
  })

  useEffect(() => {
    const token = localStorage.getItem('github_token')
    if (!token) return

    fetch('http://localhost:3000/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((projects) => {
        const totalProjects = projects.length
        let totalDeployments = 0
        let runningDeployments = 0
        let failedDeployments = 0
        const allDeployments: any[] = []

        projects.forEach((project: any) => {
          const deployments = project.deployments || []
          totalDeployments += deployments.length
          deployments.forEach((deploy: any) => {
            allDeployments.push({ ...deploy, projectName: project.name, projectId: project.id })
            if (deploy.status === 'running') runningDeployments++
            if (deploy.status === 'failed') failedDeployments++
          })
        })

        setStats({ totalProjects, totalDeployments, runningDeployments, failedDeployments })
        setRecentProjects(projects.slice(0, 3))
        setRecentDeployments(allDeployments.slice(0, 5))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
        <p className="text-sm text-[#4072af]/70 dark:text-[#7aa8d8]/70">Loading dashboard...</p>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      spark: sparkSeeds.current.projects,
      color: '#4072af',
      bgAccent: 'from-[#4072af]/[0.07]',
      iconBg: 'bg-[#dae2ef] dark:bg-[#1a3558]',
      iconColor: 'text-[#4072af] dark:text-[#7aa8d8]',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none">
          <rect x="2" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 5V3.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
    },
    {
      label: 'Total Deployments',
      value: stats.totalDeployments,
      spark: sparkSeeds.current.deployments,
      color: '#6366f1',
      bgAccent: 'from-indigo-500/[0.07]',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none">
          <path d="M9 2v10M5 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Running',
      value: stats.runningDeployments,
      spark: sparkSeeds.current.running,
      color: '#10b981',
      bgAccent: 'from-emerald-500/[0.07]',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6.5 7l2.5 2-2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M11 9h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: 'Failed',
      value: stats.failedDeployments,
      spark: sparkSeeds.current.failed,
      color: '#ef4444',
      bgAccent: 'from-red-500/[0.07]',
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 5.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="9" cy="12.5" r=".75" fill="currentColor"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="mx-auto py-8 px-4 space-y-6">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium text-[#102d4d] dark:text-[#e2eaf4]">Overview</h1>
          <p className="mt-1 text-sm text-[#5a7a9e] dark:text-[#7aa0c4]">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4072af] text-white hover:bg-[#3362a0] active:scale-95 transition-all"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          New project
        </Link>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035]"
          >
            {/* gradient wash */}
            <div className={`absolute inset-0 bg-gradient-to-b ${card.bgAccent} to-transparent pointer-events-none`} />

            <div className="relative p-4 flex flex-col gap-3">
              {/* icon + label */}
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-lg ${card.iconBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
                <span className="text-[11px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60 font-medium">
                  {card.label}
                </span>
              </div>

              {/* value */}
              <p className="text-3xl font-semibold tabular-nums" style={{ color: card.color }}>
                {card.value}
              </p>

              {/* sparkline */}
              <div className="h-8 -mx-1">
                <Spark values={card.spark} color={card.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Projects */}
        <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dae2ef]/60 dark:border-[#1e3a5f]/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558]">
                <svg className="w-3.5 h-3.5 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="2" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4.5 5h5M4.5 7.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-[#102d4d] dark:text-[#e2eaf4]">Recent Projects</span>
            </div>
            <Link href="/projects" className="text-[11px] text-[#4072af] dark:text-[#7aa8d8] hover:underline opacity-80 hover:opacity-100 transition-opacity">
              View all →
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <div className="divide-y divide-[#dae2ef]/40 dark:divide-[#1e3a5f]/40">
              {recentProjects.map((project: any) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f0f3f8] dark:hover:bg-[#1a2e44] transition-colors group"
                >
                  {/* avatar */}
                  <div className="w-8 h-8 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558] flex items-center justify-center shrink-0 text-[12px] font-medium text-[#4072af] dark:text-[#7aa8d8]">
                    {project.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#102d4d] dark:text-[#e2eaf4] truncate">{project.name}</p>
                    <p className="text-[11px] text-[#5a7a9e] dark:text-[#7aa0c4] truncate">{project.repository}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[#4072af]/60 dark:text-[#7aa8d8]/60 tabular-nums">
                      {project.deployments?.length || 0} deploys
                    </span>
                    <svg className="w-3 h-3 text-[#4072af]/30 group-hover:text-[#4072af] dark:text-[#7aa8d8]/30 dark:group-hover:text-[#7aa8d8] transition-colors" viewBox="0 0 10 10" fill="none">
                      <path d="M3.5 2l3.5 3-3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#dae2ef] dark:bg-[#1a3558] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#4072af]/60 dark:text-[#7aa8d8]/60" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M7 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-[#5a7a9e] dark:text-[#7aa0c4]">
                No projects yet.{' '}
                <Link href="/projects/new" className="text-[#4072af] dark:text-[#7aa8d8] hover:underline">
                  Create one →
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Recent Deployments */}
        <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dae2ef]/60 dark:border-[#1e3a5f]/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558]">
                <svg className="w-3.5 h-3.5 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-[#102d4d] dark:text-[#e2eaf4]">Recent Deployments</span>
            </div>
            <Link href="/deployments" className="text-[11px] text-[#4072af] dark:text-[#7aa8d8] hover:underline opacity-80 hover:opacity-100 transition-opacity">
              View all →
            </Link>
          </div>

          {recentDeployments.length > 0 ? (
            <div className="divide-y divide-[#dae2ef]/40 dark:divide-[#1e3a5f]/40">
              {recentDeployments.map((deployment: any) => (
                <div key={deployment.id} className="flex items-center gap-3 px-5 py-3.5">
                  {/* status dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    deployment.status === 'running'  ? 'bg-emerald-400 animate-pulse' :
                    deployment.status === 'failed'   ? 'bg-red-400' :
                    deployment.status === 'building' ? 'bg-amber-400 animate-pulse' :
                    'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#102d4d] dark:text-[#e2eaf4] truncate">
                      {deployment.projectName}
                    </p>
                    <p className="text-[11px] font-mono text-[#5a7a9e] dark:text-[#7aa0c4] truncate">
                      {deployment.commit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <StatusBadge status={deployment.status} />
                    <span className="text-[11px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60 hidden sm:block">
                      {deployment.createdAt
                        ? new Date(deployment.createdAt).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#dae2ef] dark:bg-[#1a3558] flex items-center justify-center">
                <svg className="w-5 h-5 text-[#4072af]/60 dark:text-[#7aa8d8]/60" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2v12M6 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-[#5a7a9e] dark:text-[#7aa0c4]">No deployments yet</p>
            </div>
          )}
        </div>

      </div>

      {/* ── Activity bar chart ── */}
      <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dae2ef]/60 dark:border-[#1e3a5f]/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558]">
              <svg className="w-3.5 h-3.5 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 14 14" fill="none">
                <path d="M2 11l3-4 3 2.5 2.5-4L13 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-[#102d4d] dark:text-[#e2eaf4]">Deploy activity</span>
          </div>
          <span className="text-[11px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60">Last 14 days</span>
        </div>
        <div className="px-5 py-4">
          <ActivityBars deployments={recentDeployments} />
        </div>
      </div>

    </div>
  )
}

// ─── Activity bar chart (last 14 days) ───────────────────────────
function ActivityBars({ deployments }: { deployments: any[] }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })

  const counts = days.map((label) => {
    const count = deployments.filter((dep) => {
      if (!dep.createdAt) return false
      const d = new Date(dep.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return d === label
    }).length
    return { label, count }
  })

  const max = Math.max(...counts.map(c => c.count), 1)

  return (
    <div className="flex items-end gap-1.5 h-20">
      {counts.map(({ label, count }, i) => {
        const pct = (count / max) * 100
        const isToday = i === counts.length - 1
        return (
          <div key={label} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t-sm transition-all ${
                count === 0
                  ? 'bg-[#dae2ef] dark:bg-[#1e3a5f]'
                  : isToday
                  ? 'bg-[#4072af] dark:bg-[#5a8fd4]'
                  : 'bg-[#4072af]/50 dark:bg-[#5a8fd4]/50 group-hover:bg-[#4072af]/80 dark:group-hover:bg-[#5a8fd4]/80'
              }`}
              style={{ height: `${Math.max(pct, count > 0 ? 8 : 4)}%` }}
            />
            {/* tooltip */}
            {count > 0 && (
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-[#102d4d] dark:bg-[#e2eaf4] text-white dark:text-[#102d4d] text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap">
                  {count} deploy{count > 1 ? 's' : ''}<br/>
                  <span className="opacity-60">{label}</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}