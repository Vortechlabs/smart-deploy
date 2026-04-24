'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import DeployButton from '@/components/DeployButton'
import Terminal from '@/components/Terminal'
import MetricsCard from '@/components/MetricsCard'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null)
  const [autoDeploy, setAutoDeploy] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // 🔥 Ref untuk cegah fetch berulang
  const initialFetchDone = useRef(false)
  const currentStatus = useRef<string>('')
  
  const fetchProject = async () => {
    if (!id) return
    
    try {
      const data = await api.projects.get(id as string)
      setProject(data)
      setAutoDeploy(data.autoDeploy ?? true)
      currentStatus.current = data.status
    } catch (err) {
      console.error('Failed to fetch project:', err)
    } finally {
      setLoading(false)
    }
  }
  
  // 🔥 Fetch project status ONLY (lightweight) - untuk realtime update
  const fetchProjectStatus = async () => {
    if (!id) return
    
    const token = localStorage.getItem('github_token')
    if (!token) return
    
    try {
      const res = await fetch(`http://41.216.191.42:3000/projects/${id}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        // 🔥 Update status tanpa mereset project lain
        setProject((prev: any) => {
          if (!prev) return prev
          return {
            ...prev,
            status: data.status,
            deployments: data.deployments || prev.deployments
          }
        })
        currentStatus.current = data.status
      }
    } catch (err) {
      // Silent fail - jangan ganggu UI
    }
  }
  
  useEffect(() => {
    if (!initialFetchDone.current) {
      fetchProject()
      initialFetchDone.current = true
    }
    
    // 🔥 HANYA refresh status setiap 3 detik jika status building/pending
    const interval = setInterval(() => {
      if (currentStatus.current === 'building' || currentStatus.current === 'pending') {
        fetchProjectStatus()
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [id])
  
  // 🔥 Refresh full project saat status berubah ke running/failed (sekali saja)
  useEffect(() => {
    if (project?.status === 'running' || project?.status === 'failed') {
      // Stop interval refresh, sudah final
    }
  }, [project?.status])

  const handleDeployStart = (deploymentId: string) => {
    setActiveDeploymentId(deploymentId)
    currentStatus.current = 'building'
    // Fetch full project untuk dapat deployment list
    api.projects.get(id as string).then(setProject)
  }
  
  const handleDelete = async () => {
    try {
      await api.projects.delete(id as string)
      router.push('/projects')
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const toggleAutoDeploy = async () => {
    setToggling(true)
    const token = localStorage.getItem('github_token')
    
    try {
      const res = await fetch(`http://41.216.191.42:3000/projects/${id}/auto-deploy`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ autoDeploy: !autoDeploy })
      })
      
      if (res.ok) {
        setAutoDeploy(!autoDeploy)
      }
    } catch (err) {
      console.error('Failed to toggle:', err)
    } finally {
      setToggling(false)
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      case 'building': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      case 'failed': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading project...</p>
      </div>
    )
  }
  
  if (!project) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v8M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Project Not Found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-4">The project you're looking for doesn't exist.</p>
        <Link 
          href="/projects" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
            <path d="M10 3L6 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Projects
        </Link>
      </div>
    )
  }
  
  return (
    <div className="mx-auto py-6 px-4 space-y-6">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Project</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/projects" 
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 14 14" fill="none">
                <path d="M8 3L4 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white truncate">
              {project.name}
            </h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 ml-10">
            <a
              href={`http://${project.subdomain} `}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {project.subdomain} 
            </a>
            
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusColor(project.status)}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'running' || project.status === 'building' ? 'animate-pulse' : ''} bg-current`} />
              {project.status || 'pending'}
            </span>
            
            <button
              onClick={toggleAutoDeploy}
              disabled={toggling}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                autoDeploy 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoDeploy ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {autoDeploy ? 'Auto Deploy ON' : 'Auto Deploy OFF'}
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DeployButton projectId={project.id} onDeployStart={handleDeployStart} />
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            aria-label="Delete project"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M4 5h12M8 8v6M12 8v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5 5l1 11a2 2 0 002 2h4a2 2 0 002-2l1-11" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 3a1 1 0 011-1h2a1 1 0 011 1v2H8V3z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Repository Info */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.42c-2.23.48-2.7-1.08-2.7-1.08-.36-.92-.89-1.16-.89-1.16-.73-.5.05-.49.05-.49.81.05 1.24.84 1.24.84.72 1.23 1.89.88 2.35.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400 font-mono text-sm truncate">
            {project.repoUrl}
          </span>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <span className="text-gray-500 dark:text-gray-500 text-sm">
            {project.branch}
          </span>
        </div>
      </div>
      
      {/* Metrics Card */}
      {project.status === 'running' && (
        <MetricsCard projectId={project.id} />
      )}
      
      {/* Deployment History */}
      {project.deployments && project.deployments.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Deployment History</h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {project.deployments.slice(0, 5).map((deployment: any) => (
              <Link
                key={deployment.id}
                href={`/deployments/${deployment.id}`}
                className="block px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      deployment.status === 'running' ? 'bg-emerald-500' :
                      deployment.status === 'building' ? 'bg-amber-500 animate-pulse' :
                      deployment.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <code className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {deployment.commitHash?.substring(0, 7) || '—'}
                    </code>
                    {deployment.commitMsg && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                        {deployment.commitMsg}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 ml-5 sm:ml-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(deployment.status)}`}>
                      {deployment.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {deployment.createdAt ? new Date(deployment.createdAt).toLocaleString() : '—'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Live Logs - TIDAK AKAN KEDIP karena hanya render saat activeDeploymentId berubah */}
      {activeDeploymentId && (
        <div className="bg-gray-900 dark:bg-black rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-300">Live Deployment Logs</span>
          </div>
          <div className="p-4">
            <Terminal deploymentId={activeDeploymentId} />
          </div>
        </div>
      )}
      
      {/* CI/CD Info */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="none">
              <path d="M10 2v12M6 10l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Auto CI/CD Active</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Every push to <code className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-mono">{project.branch}</code> triggers automatic deployment.
              <br />
              <span className="opacity-60">Checks for new commits every 2 minutes.</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* AI Analysis */}
      {project.deployments?.[0]?.status === 'failed' && project.deployments[0]?.aiSuggestion && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none">
                <path d="M9.5 2C6.46243 2 4 4.46243 4 7.5C4 8.85466 4.5 10.0912 5.31802 11.0457" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M17.5 2C20.5376 2 23 4.46243 23 7.5C23 8.85466 22.5 10.0912 21.682 11.0457" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 22L9.5 19.5M12 22L14.5 19.5M12 22V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
                <path d="M5 13C3.34315 13 2 14.3431 2 16C2 17.6569 3.34315 19 5 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M19 13C20.6569 13 22 14.3431 22 16C22 17.6569 20.6569 19 19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-medium text-purple-900 dark:text-purple-300">Smart Analysis</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300">AI</span>
              </div>
              <p className="text-sm text-purple-700 dark:text-purple-400 whitespace-pre-wrap leading-relaxed">
                {project.deployments[0].aiSuggestion}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button 
                  onClick={() => navigator.clipboard.writeText(project.deployments[0].aiSuggestion)}
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none">
                    <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M3 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  Copy suggestion
                </button>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="text-xs text-gray-400">Powered by Gemini</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}