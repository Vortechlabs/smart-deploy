'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    api.projects.list()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Fungsi untuk generate thumbnail dari website langsung
  const getThumbnailUrl = (projectId: string, url: string) => {
    // Gunakan service screenshot gratis
    return `https://image.thum.io/get/width/400/crop/800/maxAge/1/${url}`
  }

  const statusStyles: Record<string, string> = {
    running: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800',
    building: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800',
    failed: 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800',
    pending: 'text-[#4072af] bg-[#dae2ef] border-[#b3c8e3] dark:text-[#7aa8d8] dark:bg-[#102d4d]/60 dark:border-[#1e4878]',
  }

  const StatusBadge = ({ status }: { status?: string }) => {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
        <p className="text-sm text-[#4072af]/70">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-[#102d4d] dark:text-[#dae2ef]">Projects</h1>
          <p className="text-sm text-[#4072af]/60 mt-0.5">
            {projects.length > 0 ? `${projects.length} project${projects.length > 1 ? 's' : ''} total` : 'No projects yet'}
          </p>
        </div>
        <Link href="/projects/new" className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#4072af] text-white hover:bg-[#3362a0] transition-all">
          <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New project
        </Link>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border border-dashed border-[#b3c8e3] dark:border-[#1e4878] bg-[#f9f7f8] dark:bg-[#0d1e2e]">
          <div className="w-12 h-12 rounded-xl bg-[#dae2ef] dark:bg-[#102d4d] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">No projects yet</p>
            <p className="text-xs text-[#4072af]/60 mt-1">Create your first project to get started</p>
          </div>
          <Link href="/projects/new" className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#4072af] text-white hover:bg-[#3362a0] transition-colors">
            <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            New project
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => {
            const projectUrl = `http://${project.subdomain}.localhost`
            const isRunning = project.status === 'running'
            const thumbnailUrl = `https://image.thum.io/get/width/400/crop/800/${projectUrl}`
            
            return (
              <div key={project.id} className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl overflow-hidden">
                {/* Project Info */}
                <Link
                  href={`/projects/${project.id}`}
                  className="group flex items-center justify-between gap-4 px-2 py-2 hover:bg-[#f9f7f8] dark:hover:bg-[#0d1e2e] transition-all"
                >
                  {/* Left - Thumbnail Preview */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Thumbnail container */}
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-[#dae2ef] dark:bg-[#102d4d] shrink-0 border border-[#b3c8e3] dark:border-[#1e4878]">
                      {isRunning ? (
                        <div className="absolute inset-0">
                          <iframe
                            src={projectUrl}
                            title={`Preview of ${project.name}`}
                            className="w-full h-full border-0 pointer-events-none"
                            sandbox="allow-same-origin allow-scripts"
                            loading="lazy"
                            style={{
                              transform: 'scale(0.25)',
                              transformOrigin: '0 0',
                              width: '400%',
                              height: '400%'
                            }}
                          />
                          <div className="absolute inset-0 bg-transparent cursor-default" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#4072af] to-[#7aa8d8]">
                          <span className="text-white text-sm font-medium">
                            {project.name?.[0]?.toUpperCase() ?? '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef] truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-[#4072af]/60 dark:text-[#7aa8d8]/60 flex items-center gap-1 truncate">
                        <svg className="w-3 h-3 shrink-0 opacity-60" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M8 .25C3.73.25.25 3.73.25 8a7.75 7.75 0 005.3 7.37c.39.07.53-.17.53-.37v-1.3c-2.16.47-2.62-1.04-2.62-1.04-.36-.91-.87-1.15-.87-1.15-.71-.48.05-.47.05-.47.79.06 1.2.81 1.2.81.7 1.2 1.84.85 2.29.65.07-.5.27-.85.49-1.04-1.73-.2-3.54-.86-3.54-3.84 0-.85.3-1.54.8-2.08-.08-.2-.35-1 .07-2.07 0 0 .65-.21 2.13.79A7.4 7.4 0 018 4.17c.66 0 1.32.09 1.94.26 1.48-1 2.13-.79 2.13-.79.42 1.07.15 1.87.07 2.07.5.54.8 1.23.8 2.08 0 2.99-1.82 3.64-3.55 3.83.28.24.52.71.52 1.43v2.12c0 .21.14.45.54.37A7.75 7.75 0 0015.75 8C15.75 3.73 12.27.25 8 .25z" />
                        </svg>
                        {project.repoUrl}
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-mono text-[#4072af] dark:text-[#7aa8d8]">
                        {project.subdomain}.localhost
                      </p>
                      <p className="text-xs text-[#4072af]/50 dark:text-[#7aa8d8]/50 mt-0.5">
                        {project.deployments?.[0]?.createdAt
                          ? `Deployed ${new Date(project.deployments[0].createdAt).toLocaleDateString()}`
                          : 'Never deployed'}
                      </p>
                    </div>
                    <StatusBadge status={project.status} />
                    <svg className="w-3.5 h-3.5 text-[#4072af]/30 group-hover:text-[#4072af] transition-colors" viewBox="0 0 12 12" fill="none">
                      <path d="M4.5 2.5l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
