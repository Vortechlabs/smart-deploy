'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { api } from '@/lib/api'
import Terminal from '@/components/Terminal'

export default function DeploymentPage() {
  const { id } = useParams()
  const [deployment, setDeployment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  
  const deploymentId = useMemo(() => id as string, [id])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    const token = localStorage.getItem('github_token')
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/deployments/${id}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const data = await res.json()
      
      if (res.ok) {
        fetchDeployment()
      } else {
        alert(data.error || 'Failed to analyze')
      }
    } catch (err) {
      console.error('Analysis failed:', err)
      alert('Failed to analyze error')
    } finally {
      setAnalyzing(false)
    }
  }
  
  const fetchDeployment = async () => {
    if (!id || !isClient) return
    try {
      const data = await api.deployments.get(id as string)
      setDeployment(data)
    } catch (err) {
      console.error('Failed to fetch deployment:', err)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!id || !isClient) return
    fetchDeployment()
    
    const interval = setInterval(() => {
      if (deployment?.status === 'building' || deployment?.status === 'pending') {
        fetchDeployment()
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [id, isClient, deployment?.status])

  const statusStyles: Record<string, string> = {
    running: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
    building: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
    failed: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800',
    pending: 'text-[#4072af] bg-[#dae2ef] border-[#b3c8e3] dark:text-[#7aa8d8] dark:bg-[#102d4d]/60 dark:border-[#1e4878]',
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const key = status || 'pending'
    const styles = statusStyles[key] ?? statusStyles.pending
    const isPulsing = key === 'running' || key === 'building'
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${styles}`}>
        <span className={`w-1.5 h-1.5 rounded-full bg-current ${isPulsing ? 'animate-pulse' : ''}`} />
        {key}
      </span>
    )
  }

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )

  const CardLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[11px] font-medium tracking-widest uppercase text-[#4072af]/60 dark:text-[#7aa8d8]/60 mb-3">
      {children}
    </p>
  )
  
  if (!isClient || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
        <p className="text-sm text-[#4072af]/70 dark:text-[#7aa8d8]/70">Loading deployment...</p>
      </div>
    )
  }
  
  if (!deployment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#dae2ef] dark:bg-[#102d4d] flex items-center justify-center text-2xl">🔍</div>
        <h1 className="text-xl font-medium text-[#102d4d] dark:text-[#dae2ef]">Deployment not found</h1>
        <p className="text-sm text-[#4072af]/70 dark:text-[#7aa8d8]/70 max-w-sm">
          The deployment you're looking for doesn't exist or you don't have access.
        </p>
        <Link href="/projects" className="mt-2 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4072af] text-white hover:bg-[#3362a0] transition-colors">
          ← Back to Projects
        </Link>
      </div>
    )
  }
  
  return (
    <div className="mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium text-[#102d4d] dark:text-[#dae2ef]">Deployment Details</h1>
            <StatusBadge status={deployment.status} />
          </div>
          <p className="text-sm text-[#4072af]/70 dark:text-[#7aa8d8]/70 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 opacity-60" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 .25C3.73.25.25 3.73.25 8a7.75 7.75 0 005.3 7.37c.39.07.53-.17.53-.37v-1.3c-2.16.47-2.62-1.04-2.62-1.04-.36-.91-.87-1.15-.87-1.15-.71-.48.05-.47.05-.47.79.06 1.2.81 1.2.81.7 1.2 1.84.85 2.29.65.07-.5.27-.85.49-1.04-1.73-.2-3.54-.86-3.54-3.84 0-.85.3-1.54.8-2.08-.08-.2-.35-1 .07-2.07 0 0 .65-.21 2.13.79A7.4 7.4 0 018 4.17c.66 0 1.32.09 1.94.26 1.48-1 2.13-.79 2.13-.79.42 1.07.15 1.87.07 2.07.5.54.8 1.23.8 2.08 0 2.99-1.82 3.64-3.55 3.83.28.24.52.71.52 1.43v2.12c0 .21.14.45.54.37A7.75 7.75 0 0015.75 8C15.75 3.73 12.27.25 8 .25z" />
            </svg>
            Project:{' '}
            <Link href={`/projects/${deployment.projectId}`} className="hover:underline text-[#4072af] dark:text-[#7aa8d8]">
              {deployment.project?.name || deployment.projectId}
            </Link>
          </p>
        </div>
        
        <Link href={`/projects/${deployment.projectId}`} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#dae2ef] text-[#4072af] border border-[#b3c8e3] hover:bg-[#c8d8ed] dark:bg-[#102d4d]/60 dark:text-[#7aa8d8] dark:border-[#1e4878] dark:hover:bg-[#102d4d] transition-colors shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
            <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Project
        </Link>
      </div>

      {/* Deployment Info Card */}
      <Card>
        <CardLabel>Deployment Information</CardLabel>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50">Commit Hash</p>
              <code className="text-sm font-mono text-[#4072af] dark:text-[#7aa8d8] bg-[#dae2ef]/30 dark:bg-[#102d4d]/40 px-2 py-1 rounded">{deployment.commitHash}</code>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50">Status</p>
              <div><StatusBadge status={deployment.status} /></div>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50">Started At</p>
              <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">{new Date(deployment.createdAt).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50">Finished At</p>
              <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">
                {deployment.finishedAt ? new Date(deployment.finishedAt).toLocaleString() : <span className="text-[#4072af]/60 dark:text-[#7aa8d8]/60 italic">In progress...</span>}
              </p>
            </div>
          </div>
          
          {deployment.commitMsg && (
            <div className="pt-2 border-t border-[#dae2ef] dark:border-[#1e3a5f]">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50 mb-1">Commit Message</p>
              <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">{deployment.commitMsg}</p>
            </div>
          )}
        </div>
      </Card>

      {/* 🔥 TOMBOL ANALYZE - Muncul saat failed dan belum ada aiSuggestion */}
      {deployment.status === 'failed' && !deployment.aiSuggestion && (
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <path d="M10 15L7.5 12.5M10 15L12.5 12.5M10 15V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 8C4 8 3 9 3 10.5C3 12 4 13 5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 8C16 8 17 9 17 10.5C17 12 16 13 15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Analyze with Smart AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Build Logs */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardLabel>Build Logs</CardLabel>
          {deployment.status === 'building' && <StatusBadge status="building" />}
        </div>
        <Terminal key={deploymentId} deploymentId={deploymentId} />
      </Card>

      {/* AI Analysis Result */}
      {deployment.aiSuggestion && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" viewBox="0 0 20 20" fill="none">
                <path d="M10 15L7.5 12.5M10 15L12.5 12.5M10 15V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-purple-900 dark:text-purple-300">Smart Analysis</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 ml-auto">AI Powered</span>
          </div>
          
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{deployment.aiSuggestion}</p>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">🤖 This analysis was generated to help you fix the issue.</p>
            <button onClick={() => navigator.clipboard.writeText(deployment.aiSuggestion)} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">Copy</button>
          </div>
        </div>
      )}
    </div>
  )
}