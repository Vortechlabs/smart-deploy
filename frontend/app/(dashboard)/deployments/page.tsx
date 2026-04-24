'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

interface Deployment {
  id: string
  commitHash: string
  commitMsg: string
  status: string
  createdAt: string
  finishedAt: string
  projectId: string
  project: {
    name: string
    subdomain: string
  }
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  
  useEffect(() => {
    fetchAllDeployments()
  }, [])
  
  const fetchAllDeployments = async () => {
    try {
      // Ambil semua projects dulu
      const projects = await api.projects.list()
      
      // Ambil semua deployments dari setiap project
      const allDeployments: Deployment[] = []
      for (const project of projects) {
        const projectDetail = await api.projects.get(project.id)
        if (projectDetail.deployments) {
          allDeployments.push(...projectDetail.deployments.map((d: any) => ({
            ...d,
            project: {
              name: project.name,
              subdomain: project.subdomain
            }
          })))
        }
      }
      
      // Sort by createdAt descending
      allDeployments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      
      setDeployments(allDeployments)
    } catch (err) {
      console.error('Failed to fetch deployments:', err)
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-emerald-500'
      case 'building': return 'bg-amber-500 animate-pulse'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running': return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
      case 'building': return 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800'
      case 'failed': return 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800'
      default: return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950/40 dark:border-gray-800'
    }
  }
  
  const filteredDeployments = filter === 'all' 
    ? deployments 
    : deployments.filter(d => d.status === filter)
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
        <p className="text-sm text-[#4072af]/70">Loading deployments...</p>
      </div>
    )
  }
  
  return (
    <div className="mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-[#102d4d] dark:text-[#dae2ef]">
            Deployments
          </h1>
          <p className="text-sm text-[#4072af]/60 mt-0.5">
            {deployments.length} total deployment{deployments.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#f0f3f8] dark:bg-[#0d1e2e]">
          {['all', 'running', 'building', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === status
                  ? 'bg-white dark:bg-[#0f2035] text-[#4072af] dark:text-[#7aa8d8] shadow-sm'
                  : 'text-[#5a7a9e] dark:text-[#7aa0c4] hover:text-[#4072af]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      
      {/* Deployments List */}
      {filteredDeployments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-dashed border-[#b3c8e3] dark:border-[#1e4878] bg-[#f9f7f8] dark:bg-[#0d1e2e]">
          <div className="w-16 h-16 rounded-xl bg-[#dae2ef] dark:bg-[#102d4d] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-base font-medium text-[#102d4d] dark:text-[#dae2ef]">No deployments yet</p>
            <p className="text-sm text-[#4072af]/60 mt-1">
              {filter !== 'all' ? `No ${filter} deployments found` : 'Create a project and deploy it to see deployments here'}
            </p>
            {filter === 'all' && (
              <Link href="/projects/new" className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 mt-4 rounded-lg bg-[#4072af] text-white hover:bg-[#3362a0] transition-colors">
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Create Project
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeployments.map((deployment) => (
            <Link
              key={deployment.id}
              href={`/deployments/${deployment.id}`}
              className="block group"
            >
              <div className="p-4 rounded-xl bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] hover:border-[#4072af] dark:hover:border-[#4072af] transition-all">
                <div className="flex items-center justify-between gap-4">
                  {/* Left */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(deployment.status)}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef] truncate">
                          {deployment.project?.name || 'Unknown Project'}
                        </p>
                        <code className="text-xs font-mono text-[#4072af]/70 dark:text-[#7aa8d8]/70 bg-[#f0f3f8] dark:bg-[#0d1e2e] px-1.5 py-0.5 rounded">
                          {deployment.commitHash?.slice(0, 7)}
                        </code>
                      </div>
                      {deployment.commitMsg && (
                        <p className="text-xs text-[#4072af]/50 truncate mt-0.5">
                          {deployment.commitMsg}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Right */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-mono text-[#4072af] dark:text-[#7aa8d8]">
                        {deployment.project?.subdomain} 
                      </p>
                      <p className="text-xs text-[#4072af]/50 mt-0.5">
                        {new Date(deployment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${getStatusBadge(deployment.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full bg-current ${deployment.status === 'building' ? 'animate-pulse' : ''}`} />
                      {deployment.status}
                    </span>
                    
                    <svg className="w-3.5 h-3.5 text-[#4072af]/30 group-hover:text-[#4072af] dark:text-[#7aa8d8]/30 dark:group-hover:text-[#7aa8d8] transition-colors" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      
      {/* Stats */}
      {deployments.length > 0 && (
        <div className="grid grid-cols-4 gap-3 pt-4">
          <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f]">
            <p className="text-xs text-[#4072af]/60 mb-1">Total</p>
            <p className="text-xl font-medium text-[#102d4d] dark:text-[#dae2ef]">{deployments.length}</p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f]">
            <p className="text-xs text-[#4072af]/60 mb-1">Running</p>
            <p className="text-xl font-medium text-emerald-600 dark:text-emerald-400">
              {deployments.filter(d => d.status === 'running').length}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f]">
            <p className="text-xs text-[#4072af]/60 mb-1">Building</p>
            <p className="text-xl font-medium text-amber-600 dark:text-amber-400">
              {deployments.filter(d => d.status === 'building').length}
            </p>
          </div>
          <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f]">
            <p className="text-xs text-[#4072af]/60 mb-1">Failed</p>
            <p className="text-xl font-medium text-red-600 dark:text-red-400">
              {deployments.filter(d => d.status === 'failed').length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}