'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface TechItem {
  name: string
  version?: string
  description: string
  icon: string
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'ai' | 'infrastructure'
  link?: string
}

export default function TechStackPage() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const techStack: TechItem[] = [
    // Frontend
    {
      name: 'Next.js',
      version: '16.2.4',
      description: 'React framework with App Router, Server Components, and Turbopack',
      icon: '▲',
      category: 'frontend',
      link: 'https://nextjs.org'
    },
    {
      name: 'React',
      version: '19.2.4',
      description: 'UI library for building interactive user interfaces',
      icon: '⚛️',
      category: 'frontend',
      link: 'https://react.dev'
    },
    {
      name: 'TypeScript',
      version: '5.x',
      description: 'Typed JavaScript for better developer experience',
      icon: '📘',
      category: 'frontend',
      link: 'https://typescriptlang.org'
    },
    {
      name: 'Tailwind CSS',
      version: '3.x',
      description: 'Utility-first CSS framework for rapid styling',
      icon: '🎨',
      category: 'frontend',
      link: 'https://tailwindcss.com'
    },
    {
      name: 'TanStack Query',
      version: '5.99.0',
      description: 'Powerful data fetching and state management',
      icon: '🔄',
      category: 'frontend',
      link: 'https://tanstack.com/query'
    },
    {
      name: 'Axios',
      version: '1.15.0',
      description: 'Promise-based HTTP client',
      icon: '📡',
      category: 'frontend',
      link: 'https://axios-http.com'
    },
    
    // Backend
    {
      name: 'Bun',
      version: '1.3.12',
      description: 'Fast all-in-one JavaScript runtime & package manager',
      icon: '🥟',
      category: 'backend',
      link: 'https://bun.sh'
    },
    {
      name: 'Elysia',
      version: '1.4.28',
      description: 'Ergonomic web framework for Bun with end-to-end type safety',
      icon: '⚡',
      category: 'backend',
      link: 'https://elysiajs.com'
    },
    {
      name: 'Prisma',
      version: '7.7.0',
      description: 'Next-generation ORM for Node.js and TypeScript',
      icon: '🔷',
      category: 'database',
      link: 'https://prisma.io'
    },
    {
      name: 'PostgreSQL',
      version: '15',
      description: 'Advanced open-source relational database',
      icon: '🐘',
      category: 'database',
      link: 'https://postgresql.org'
    },
    {
      name: 'Redis',
      version: '7',
      description: 'In-memory data store for caching and message queues',
      icon: '🔴',
      category: 'database',
      link: 'https://redis.io'
    },
    {
      name: 'BullMQ',
      version: '5.74.1',
      description: 'Robust job queue system for background processing',
      icon: '🐂',
      category: 'backend',
      link: 'https://bullmq.io'
    },
    
    // DevOps & Infrastructure
    {
      name: 'Docker',
      version: 'Latest',
      description: 'Containerization platform for consistent deployments',
      icon: '🐳',
      category: 'devops',
      link: 'https://docker.com'
    },
    {
      name: 'Docker Swarm',
      version: 'Latest',
      description: 'Native container orchestration with auto-scaling',
      icon: '🐝',
      category: 'devops',
      link: 'https://docs.docker.com/engine/swarm/'
    },
    {
      name: 'Kubernetes',
      version: '1.27+',
      description: 'Production-grade container orchestration (optional)',
      icon: '☸️',
      category: 'devops',
      link: 'https://kubernetes.io'
    },
    {
      name: 'Nginx',
      version: '1.24.0',
      description: 'High-performance reverse proxy and load balancer',
      icon: '🌐',
      category: 'infrastructure',
      link: 'https://nginx.com'
    },
    {
      name: 'Kind',
      version: '0.20.0',
      description: 'Kubernetes in Docker for local development',
      icon: '🔧',
      category: 'devops',
      link: 'https://kind.sigs.k8s.io'
    },
    
    // AI & Integrations
    {
      name: 'Gemini AI',
      version: '2.5 Flash',
      description: 'Google\'s multimodal AI for smart error analysis',
      icon: '🤖',
      category: 'ai',
      link: 'https://ai.google.dev'
    },
    {
      name: 'GitHub API',
      version: 'Octokit',
      description: 'Repository management and webhook integration',
      icon: '🐙',
      category: 'infrastructure',
      link: 'https://docs.github.com/rest'
    },
    {
      name: 'WebSocket',
      version: 'Native',
      description: 'Real-time bidirectional communication for live logs',
      icon: '🔌',
      category: 'infrastructure',
      link: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket'
    },
    
    // Additional
    {
      name: 'Archiver',
      version: '7.0.1',
      description: 'Streaming interface for archive generation',
      icon: '📦',
      category: 'backend',
      link: 'https://archiverjs.com'
    },
    {
      name: 'AdmZip',
      version: '0.5.17',
      description: 'ZIP file extraction for uploaded projects',
      icon: '🗜️',
      category: 'backend',
      link: 'https://github.com/cthackers/adm-zip'
    },
    {
      name: 'Simple Git',
      version: '3.36.0',
      description: 'Lightweight interface for Git operations',
      icon: '📂',
      category: 'backend',
      link: 'https://github.com/steveukx/git-js'
    },
    {
      name: 'ESLint',
      version: '9.x',
      description: 'Static code analysis for JavaScript/TypeScript',
      icon: '✅',
      category: 'frontend',
      link: 'https://eslint.org'
    }
  ]
  
  const categories = [
    { id: 'frontend', name: 'Frontend', color: 'blue', count: techStack.filter(t => t.category === 'frontend').length },
    { id: 'backend', name: 'Backend', color: 'green', count: techStack.filter(t => t.category === 'backend').length },
    { id: 'database', name: 'Database', color: 'purple', count: techStack.filter(t => t.category === 'database').length },
    { id: 'devops', name: 'DevOps', color: 'orange', count: techStack.filter(t => t.category === 'devops').length },
    { id: 'ai', name: 'AI & ML', color: 'pink', count: techStack.filter(t => t.category === 'ai').length },
    { id: 'infrastructure', name: 'Infrastructure', color: 'cyan', count: techStack.filter(t => t.category === 'infrastructure').length }
  ]
  
  const categoryColors: Record<string, string> = {
    frontend: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    backend: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300',
    database: 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    devops: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300',
    ai: 'border-pink-200 dark:border-pink-800 bg-pink-50 dark:bg-pink-950/20 text-pink-700 dark:text-pink-300',
    infrastructure: 'border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-700 dark:text-cyan-300'
  }
  
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
        <p className="text-sm text-[#4072af]/70">Loading...</p>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tech Stack</h1>
        <p className="text-gray-600 dark:text-gray-400">
          All the technologies powering Smart Deploy — from frontend to infrastructure.
        </p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className={`p-4 rounded-xl border ${categoryColors[cat.id]} transition-all hover:shadow-md`}
          >
            <p className="text-2xl font-bold">{cat.count}</p>
            <p className="text-sm font-medium opacity-80">{cat.name}</p>
          </div>
        ))}
      </div>
      
      {/* Tech Grid */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const items = techStack.filter(t => t.category === cat.id)
          if (items.length === 0) return null
          
          return (
            <div key={cat.id} className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full bg-${cat.color}-500`} />
                {cat.name}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({items.length} technologies)
                </span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((tech) => (
                  <TechCard key={tech.name} tech={tech} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Footer Info */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Smart Deploy is built with {techStack.length} cutting-edge technologies.
          <br />
          <span className="opacity-60">Continuously updated and improved.</span>
        </p>
      </div>
    </div>
  )
}

function TechCard({ tech }: { tech: TechItem }) {
  return (
    <a
      href={tech.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl group-hover:scale-110 transition-transform">
          {tech.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {tech.name}
            </h3>
            {tech.version && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                v{tech.version}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {tech.description}
          </p>
        </div>
        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" viewBox="0 0 20 20" fill="none">
          <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </a>
  )
}