'use client'

import { useEffect, useState, useRef } from 'react'

interface ReplicaStat {
  id: string
  cpu: number
  memory: number
  memUsage: string
  netIO?: string
  state?: string
}

interface MetricsData {
  type: 'metrics' | 'status'
  timestamp: number
  replicas: number
  desiredReplicas?: number
  avgCpu: number
  avgMemory: number
  stats: ReplicaStat[]
  hpa?: {
    currentCPU: number
    currentReplicas: number
    desiredReplicas: number
    minReplicas: number
    maxReplicas: number
  }
  subdomain: string
  status?: string
  message?: string
}

// ─── Sparkline canvas ────────────────────────────────────────────
function Sparkline({ data, color, gradFrom, gradTo }: {
  data: number[]
  color: string
  gradFrom: string
  gradTo: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c || data.length < 2) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    c.width = c.offsetWidth * devicePixelRatio
    c.height = c.offsetHeight * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)
    const W = c.offsetWidth, H = c.offsetHeight
    const max = Math.max(...data, 1), min = 0
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * W,
      y: H - ((v - min) / (max - min || 1)) * (H - 6) - 3,
    }))
    ctx.clearRect(0, 0, W, H)
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, gradFrom)
    grad.addColorStop(1, gradTo)
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
    ctx.lineWidth = 1.8
    ctx.stroke()
    const last = pts[pts.length - 1]
    ctx.beginPath()
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }, [data, color, gradFrom, gradTo])
  return <canvas ref={ref} className="w-full h-full" />
}

// ─── Arc gauge ────────────────────────────────────────────────────
function ArcGauge({ value, color, track, size = 48 }: {
  value: number; color: string; track: string; size?: number
}) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75
  const fill = arc * Math.min(value, 100) / 100
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track}
        strokeWidth="4.5" strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
        transform={`rotate(-225 ${size/2} ${size/2})`} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth="4.5" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-225 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ─── Color palettes ───────────────────────────────────────────────
const cpuPalette = (v: number) =>
  v > 80
    ? { text: 'text-red-500 dark:text-red-400',    hex: '#ef4444', track: 'rgba(239,68,68,.12)',    bar: 'bg-red-500' }
    : v > 60
    ? { text: 'text-amber-500 dark:text-amber-400', hex: '#f59e0b', track: 'rgba(245,158,11,.12)',   bar: 'bg-amber-500' }
    : { text: 'text-emerald-500 dark:text-emerald-400', hex: '#10b981', track: 'rgba(16,185,129,.12)', bar: 'bg-emerald-500' }

const memPalette = (v: number) =>
  v > 80
    ? { text: 'text-red-500 dark:text-red-400',    hex: '#ef4444', track: 'rgba(239,68,68,.12)',    bar: 'bg-red-500' }
    : v > 60
    ? { text: 'text-amber-500 dark:text-amber-400', hex: '#f59e0b', track: 'rgba(245,158,11,.12)',   bar: 'bg-amber-500' }
    : { text: 'text-sky-500 dark:text-sky-400',     hex: '#0ea5e9', track: 'rgba(14,165,233,.12)',   bar: 'bg-sky-500' }

const getStatusDot = (state?: string) => {
  if (!state) return <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
  if (state.includes('🟢')) return <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
  if (state.includes('🟡')) return <span className="w-2 h-2 rounded-full bg-amber-400" />
  return <span className="w-2 h-2 rounded-full bg-gray-400" />
}

function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
      connected
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
        : 'text-[#5a7a9e] bg-[#f0f3f8] border-[#dae2ef] dark:text-[#7aa0c4] dark:bg-[#1a2e44] dark:border-[#1e3a5f]'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current ${connected ? 'animate-pulse' : ''}`} />
      {connected ? 'Live' : 'Reconnecting...'}
    </span>
  )
}

// ─── Main component ───────────────────────────────────────────────
export default function MetricsCard({ projectId }: { projectId: string }) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [connected, setConnected] = useState(false)
  const [history, setHistory] = useState<{ cpu: number; memory: number; time: number }[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let ws: WebSocket | null = null
    let reconnectTimer: NodeJS.Timeout | null = null

    const connect = () => {
      console.log(`📊 Connecting to metrics WebSocket for project ${projectId}...`)
      try {
        ws = new WebSocket(`ws://41.216.191.42:3000/ws/metrics/${projectId}`)
        ws.onopen = () => {
          console.log('📊 Metrics WebSocket connected')
          setConnected(true)
        }
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📊 Received metrics:', data.type, 'replicas:', data.replicas)
            setMetrics(data)
            if (data.type === 'metrics') {
              setHistory(prev => [...prev, {
                cpu: data.avgCpu || 0,
                memory: data.avgMemory || 0,
                time: data.timestamp || Date.now(),
              }].slice(-30))
            }
          } catch (err) {
            console.error('Failed to parse metrics:', err, 'Raw data:', event.data)
          }
        }
        ws.onclose = (event) => {
          console.log('📊 Metrics WebSocket disconnected:', event.code, event.reason)
          setConnected(false)
          if (reconnectTimer) clearTimeout(reconnectTimer)
          reconnectTimer = setTimeout(() => {
            console.log('📊 Attempting to reconnect...')
            connect()
          }, 3000)
        }
        ws.onerror = () => {
          console.log('📊 WebSocket connection issue (will retry)')
          setConnected(false)
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        setConnected(false)
      }
    }

    connect()
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (ws) ws.close()
    }
  }, [projectId])

  // ── Loading ──────────────────────────────────────────────────────
  if (!metrics) {
    return (
      <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] p-6">
        <div className="flex items-center justify-center py-8 gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
          <span className="text-sm text-[#4072af]/70 dark:text-[#7aa8d8]/70">Connecting to metrics...</span>
        </div>
      </div>
    )
  }

  // ── Status-only ──────────────────────────────────────────────────
  if (metrics.type === 'status') {
    return (
      <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558]">
              <svg className="w-4 h-4 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 6v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">
                Service {metrics.status || 'Unknown'}
              </p>
              <p className="text-xs text-[#5a7a9e] dark:text-[#7aa0c4] mt-0.5">
                {metrics.message || 'No active replicas'}
              </p>
            </div>
          </div>
          <LiveBadge connected={connected} />
        </div>
      </div>
    )
  }

  const cpu = cpuPalette(metrics.avgCpu)
  const mem = memPalette(metrics.avgMemory)
  const cpuHistory = history.map(h => h.cpu)
  const memHistory = history.map(h => h.memory)

  return (
    <div className="rounded-2xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-white dark:bg-[#0f2035] overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#dae2ef]/60 dark:border-[#1e3a5f]/60">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[#dae2ef] dark:bg-[#1a3558]">
            <svg className="w-4 h-4 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 20 20" fill="none">
              <path d="M3 15l4-5 4 3 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">Auto-Scaling Active</p>
            <p className="text-[11px] text-[#5a7a9e] dark:text-[#7aa0c4]">{metrics.subdomain} </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`http://${metrics.subdomain} `}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#4072af] dark:text-[#7aa8d8] opacity-70 hover:opacity-100 hover:underline transition-opacity"
          >
            Open ↗
          </a>
          <LiveBadge connected={connected} />
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#dae2ef]/50 dark:divide-[#1e3a5f]/50">

        {/* Replicas */}
        <div className="relative overflow-hidden px-5 pt-4 pb-3">
          <div className="absolute inset-0 bg-gradient-to-b from-[#4072af]/[0.06] to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-[#5a7a9e] dark:text-[#7aa0c4]">Replicas</p>
                <p className="text-[10px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60 mt-0.5">Active / Desired</p>
              </div>
              <ArcGauge
                value={metrics.hpa ? (metrics.replicas / (metrics.hpa.maxReplicas || 1)) * 100 : 50}
                color="#4072af" track="rgba(64,114,175,.12)"
              />
            </div>
            <p className="text-2xl font-semibold text-[#4072af] dark:text-[#7aa8d8] tabular-nums">
              {metrics.replicas}
              {metrics.desiredReplicas && metrics.desiredReplicas !== metrics.replicas && (
                <span className="text-sm font-normal text-amber-500 ml-1.5">→ {metrics.desiredReplicas}</span>
              )}
            </p>
            {metrics.hpa && (
              <p className="text-[10px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60">
                min {metrics.hpa.minReplicas} · max {metrics.hpa.maxReplicas}
              </p>
            )}
          </div>
        </div>

        {/* Avg CPU */}
        <div className="relative overflow-hidden px-5 pt-4 pb-3">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${cpu.hex}0f 0%, transparent 100%)` }} />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-[#5a7a9e] dark:text-[#7aa0c4]">Avg CPU</p>
              <ArcGauge value={metrics.avgCpu} color={cpu.hex} track={cpu.track} />
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${cpu.text}`}>
              {metrics.avgCpu.toFixed(1)}%
            </p>
            <div className="h-8 -mx-1">
              {cpuHistory.length > 1
                ? <Sparkline data={cpuHistory} color={cpu.hex}
                    gradFrom={`${cpu.hex}55`} gradTo={`${cpu.hex}00`} />
                : <div className="h-full rounded bg-[#f0f3f8] dark:bg-[#1a2e44]" />}
            </div>
          </div>
        </div>

        {/* Avg Memory */}
        <div className="relative overflow-hidden px-5 pt-4 pb-3">
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, ${mem.hex}0f 0%, transparent 100%)` }} />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-[#5a7a9e] dark:text-[#7aa0c4]">Avg Memory</p>
              <ArcGauge value={metrics.avgMemory} color={mem.hex} track={mem.track} />
            </div>
            <p className={`text-2xl font-semibold tabular-nums ${mem.text}`}>
              {metrics.avgMemory.toFixed(1)}%
            </p>
            <div className="h-8 -mx-1">
              {memHistory.length > 1
                ? <Sparkline data={memHistory} color={mem.hex}
                    gradFrom={`${mem.hex}55`} gradTo={`${mem.hex}00`} />
                : <div className="h-full rounded bg-[#f0f3f8] dark:bg-[#1a2e44]" />}
            </div>
          </div>
        </div>

        {/* Load Balancer */}
        <div className="relative overflow-hidden px-5 pt-4 pb-3">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.06] to-transparent pointer-events-none" />
          <div className="relative flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-[#5a7a9e] dark:text-[#7aa0c4]">Load Balancer</p>
              <div className="p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-white/60 dark:bg-white/5">
                <svg className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8h12M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">Least-Conn</p>
            <p className="text-[11px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60">Round-robin fallback</p>
          </div>
        </div>
      </div>

      {/* ── HPA panel ── */}
      {metrics.hpa && (
        <div className="mx-5 my-4 rounded-xl border border-[#dae2ef] dark:border-[#1e3a5f] bg-[#f9f7f8] dark:bg-[#0d1e2e] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#dae2ef]/60 dark:border-[#1e3a5f]/60">
            <svg className="w-3.5 h-3.5 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 14 14" fill="none">
              <path d="M2 10l3-4 3 2 4-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11px] font-medium tracking-widest uppercase text-[#5a7a9e] dark:text-[#7aa0c4] opacity-70">
              HPA Status
            </span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-[#dae2ef]/50 dark:divide-[#1e3a5f]/50">
            {[
              { label: 'Current CPU', value: `${metrics.hpa.currentCPU}%`, colored: true },
              { label: 'Current',     value: String(metrics.hpa.currentReplicas) },
              { label: 'Desired',     value: String(metrics.hpa.desiredReplicas) },
              { label: 'Range',       value: `${metrics.hpa.minReplicas}–${metrics.hpa.maxReplicas}` },
            ].map((item) => (
              <div key={item.label} className="px-4 py-3 text-center">
                <p className="text-[10px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60 mb-1">{item.label}</p>
                <p className={`text-lg font-semibold tabular-nums ${
                  item.colored ? cpuPalette(metrics.hpa!.currentCPU).text : 'text-[#4072af] dark:text-[#7aa8d8]'
                }`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Replica list ── */}
      <div className="px-5 pb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <svg className="w-3 h-3 text-[#4072af]/50 dark:text-[#7aa8d8]/50" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="2" width="4" height="4" rx="1" fill="currentColor"/>
            <rect x="8" y="2" width="4" height="4" rx="1" fill="currentColor"/>
            <rect x="2" y="8" width="4" height="4" rx="1" fill="currentColor"/>
            <rect x="8" y="8" width="4" height="4" rx="1" fill="currentColor"/>
          </svg>
          <span className="text-[11px] font-medium tracking-widest uppercase text-[#5a7a9e]/70 dark:text-[#7aa0c4]/70">
            Running replicas ({metrics.replicas})
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
          {metrics.stats.map((stat) => {
            const sc = cpuPalette(stat.cpu)
            const sm = memPalette(stat.memory)
            return (
              <div key={stat.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#f9f7f8] dark:bg-[#0d1e2e] border border-[#dae2ef]/50 dark:border-[#1e3a5f]/50">
                {getStatusDot(stat.state)}
                <span className="text-xs font-mono text-[#4072af] dark:text-[#7aa8d8] flex-1 truncate min-w-0">
                  {stat.id}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-[11px] font-semibold tabular-nums ${sc.text}`}>
                      {stat.cpu.toFixed(1)}%
                    </span>
                    <div className="w-14 h-1 bg-[#dae2ef] dark:bg-[#1e3a5f] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${sc.bar}`}
                        style={{ width: `${Math.min(stat.cpu, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-[11px] font-semibold tabular-nums ${sm.text}`}>
                      {stat.memory.toFixed(1)}%
                    </span>
                    <div className="w-14 h-1 bg-[#dae2ef] dark:bg-[#1e3a5f] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${sm.bar}`}
                        style={{ width: `${Math.min(stat.memory, 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60 w-16 text-right">
                    {stat.memUsage}
                  </span>
                  {stat.netIO && (
                    <span className="text-[11px] font-mono text-[#5a7a9e]/40 dark:text-[#7aa0c4]/40 hidden sm:block">
                      {stat.netIO}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-t border-[#dae2ef]/60 dark:border-[#1e3a5f]/60 bg-[#f9f7f8]/50 dark:bg-[#0d1e2e]/50">
        <svg className="w-3 h-3 text-[#5a7a9e]/50 dark:text-[#7aa0c4]/50 shrink-0" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <p className="text-[11px] text-[#5a7a9e]/60 dark:text-[#7aa0c4]/60">
          Scale up: CPU &gt; 70% or Memory &gt; 80% · Scale down: CPU &lt; 30% and Memory &lt; 50%
        </p>
      </div>

    </div>
  )
}