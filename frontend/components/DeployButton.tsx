'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

interface DeployButtonProps {
  projectId: string
  onDeployStart?: (deploymentId: string) => void
  variant?: 'primary' | 'secondary' | 'icon'
  size?: 'sm' | 'md' | 'lg'
}

export default function DeployButton({ 
  projectId, 
  onDeployStart, 
  variant = 'primary',
  size = 'md'
}: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleDeploy = async () => {
    if (isDeploying) return
    
    setIsDeploying(true)
    setError(null)
    
    try {
      const result = await api.deployments.trigger(projectId)
      onDeployStart?.(result.deploymentId)
    } catch (err: any) {
      setError(err.message)
      setTimeout(() => setError(null), 3000)
    } finally {
      setIsDeploying(false)
    }
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  }
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent',
    secondary: 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
    icon: 'p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700'
  }
  
  if (variant === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className={`rounded-lg transition-all disabled:opacity-50 ${variantClasses.icon}`}
          title="Deploy"
        >
          {isDeploying ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" className="opacity-30" />
              <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
              <path d="M11 7l-4-3v6l4-3z" fill="currentColor" />
              <path d="M3 4v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          )}
        </button>
        
        {error && (
          <div className="absolute top-full mt-2 right-0 whitespace-nowrap px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 shadow-sm">
            {error}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="relative inline-block">
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className={`
          inline-flex items-center font-medium rounded-lg transition-all
          disabled:opacity-60 disabled:cursor-not-allowed
          shadow-sm hover:shadow-md active:scale-[0.98]
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        {isDeploying ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" className="opacity-30" />
              <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Deploying</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M7 2v10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span>Deploy</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="absolute top-full mt-2 left-0 whitespace-nowrap px-3 py-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 shadow-sm z-10">
          {error}
        </div>
      )}
    </div>
  )
}