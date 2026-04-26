'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import Terminal from '@/components/Terminal'

export default function DeploymentPage() {
  const { id } = useParams()
  const [deployment, setDeployment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  
  // 🔥 SIMPAN deploymentId DI REF - biar gak berubah
  const deploymentIdRef = useRef<string>('')
  
  useEffect(() => {
    if (id && typeof id === 'string') {
      deploymentIdRef.current = id
    }
  }, [id])
  
  const deploymentId = deploymentIdRef.current
  
  // 🔥 Fetch deployment HANYA SEKALI + pas status building
  const statusRef = useRef<string>('')
  
  const fetchDeployment = useCallback(async () => {
    if (!id || !isClient) return
    try {
      const data = await api.deployments.get(id as string)
      setDeployment(data)
      statusRef.current = data.status
    } catch (err) {
      console.error('Failed to fetch deployment:', err)
    } finally {
      setLoading(false)
    }
  }, [id, isClient])
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!id || !isClient) return
    
    // Fetch pertama
    fetchDeployment()
    
    // 🔥 HANYA poll kalau status building/pending
    const interval = setInterval(() => {
      if (statusRef.current === 'building' || statusRef.current === 'pending') {
        fetchDeployment()
      }
    }, 3000) // 3 detik biar gak terlalu sering
    
    return () => clearInterval(interval)
  }, [id, isClient, fetchDeployment])
  
  // 🔥 HENTIKAN polling begitu status final
  useEffect(() => {
    if (deployment?.status === 'running' || deployment?.status === 'failed') {
      statusRef.current = deployment.status
    }
  }, [deployment?.status])

  const handleAnalyze = async () => {
    setAnalyzing(true)
    const token = localStorage.getItem('github_token')
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const res = await fetch(`${apiBase}/deployments/${id}/analyze`, {
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
            Project:{' '}
            <Link href={`/projects/${deployment.projectId}`} className="hover:underline text-[#4072af] dark:text-[#7aa8d8]">
              {deployment.project?.name || deployment.projectId}
            </Link>
          </p>
        </div>
        
        <Link href={`/projects/${deployment.projectId}`} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#dae2ef] text-[#4072af] border border-[#b3c8e3] hover:bg-[#c8d8ed] dark:bg-[#102d4d]/60 dark:text-[#7aa8d8] dark:border-[#1e4878] dark:hover:bg-[#102d4d] transition-colors shrink-0">
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
              <StatusBadge status={deployment.status} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50">Started At</p>
              <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">{new Date(deployment.createdAt).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#4072af]/50 dark:text-[#7aa8d8]/50">Finished At</p>
              <p className="text-sm text-[#102d4d] dark:text-[#dae2ef]">
                {deployment.finishedAt ? new Date(deployment.finishedAt).toLocaleString() : <span className="italic">In progress...</span>}
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

      {/* AI Analyze Button */}
      {deployment.status === 'failed' && !deployment.aiSuggestion && (
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 15L7.5 12.5M10 15L12.5 12.5M10 15V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Analyze with Smart AI
              </>
            )}
          </button>
        </div>
      )}

      {/* Build Logs */}
      <Card>
        <CardLabel>Build Logs</CardLabel>
        {/* 🔥 PASS deploymentId YANG STABIL */}
        <Terminal deploymentId={deploymentId} />
      </Card>

      {/* AI Analysis Result */}
      {deployment.aiSuggestion && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-medium text-purple-900 dark:text-purple-300">💡 Smart Analysis</h2>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300">AI</span>
          </div>
          
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">{deployment.aiSuggestion}</p>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">🤖 Powered by Gemini AI</p>
            <button onClick={() => navigator.clipboard.writeText(deployment.aiSuggestion)} className="text-xs text-purple-600 dark:text-purple-400 hover:underline">Copy</button>
          </div>
        </div>
      )}
    </div>
  )
}