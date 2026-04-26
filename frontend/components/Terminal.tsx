'use client'

import { useEffect, useRef, useState } from 'react'

interface TerminalProps {
  deploymentId: string
  maxHeight?: string
  autoScroll?: boolean
}

export default function Terminal({ 
  deploymentId, 
  maxHeight = '400px',
  autoScroll = true 
}: TerminalProps) {
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<string>('pending')
  const [connected, setConnected] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  const pollInterval = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const mountedRef = useRef(true)
  
  // 🔥 Auto-detect API base URL
  const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000'
    return window.location.hostname === 'localhost' 
      ? 'http://localhost:3000'  // Backend selalu di 3000
      : `http://${window.location.hostname}:3000`
  }
  
  // 🔥 Polling fetch logs (jangan replace, cuma update kalau ada perubahan)
  const prevLogLength = useRef(0)
  
  const fetchLogs = async () => {
    if (!mountedRef.current) return
    
    try {
      const token = localStorage.getItem('github_token')
      const apiBase = getApiBaseUrl()
      const res = await fetch(`${apiBase}/deployments/${deploymentId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const logLines = (data.logs || '').split('\n').filter((l: string) => l.trim())
        
        // 🔥 Update HANYA kalau ada perubahan
        if (logLines.length !== prevLogLength.current) {
          prevLogLength.current = logLines.length
          setLogs(logLines)
        }
        
        // Update status
        if (data.status) {
          setStatus(data.status)
          
          // 🔥 BERHENTI polling kalau sudah final
          if (data.status === 'running' || data.status === 'failed') {
            stopPolling()
          }
        }
        
        setConnected(true)
      }
    } catch (e) {
      // silent
    }
  }
  
  const startPolling = () => {
    stopPolling()
    fetchLogs() // Langsung fetch
    pollInterval.current = setInterval(fetchLogs, 3000) // Setiap 3 detik
  }
  
  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }
  }
  
  useEffect(() => {
    mountedRef.current = true
    prevLogLength.current = 0
    
    // 🔥 JANGAN coba WebSocket dulu, langsung polling
    // Karena backend WebSocket belum diimplementasi dengan benar
    
    startPolling()
    
    return () => {
      mountedRef.current = false
      stopPolling()
      wsRef.current?.close()
    }
  }, [deploymentId])
  
  // Auto scroll
  useEffect(() => {
    if (autoScroll && preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight
    }
  }, [logs, autoScroll])
  
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
      case 'failed': return 'text-red-500 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
      case 'building': return 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }
  
  const clearLogs = () => setLogs([])
  
  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'))
  }
  
  const downloadLogs = () => {
    const text = logs.join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `deployment-${deploymentId.slice(0, 8)}.log`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <div className="rounded-xl overflow-hidden border border-gray-700 dark:border-gray-600 bg-[#0d1117] shadow-xl">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-gray-800/50 dark:bg-gray-900/50 border-b border-gray-700 dark:border-gray-600">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs text-gray-400 hidden sm:inline">
            {deploymentId.slice(0, 8)}
          </span>
          
          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor()}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${(status === 'building' || status === 'running') && connected ? 'animate-pulse bg-current' : 'bg-gray-500'}`} />
            {status}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={clearLogs} className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white" title="Clear">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M4 4v7a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button onClick={copyLogs} className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white" title="Copy">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 10V3a1 1 0 011-1h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <button onClick={downloadLogs} className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white" title="Download">
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v7M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Terminal Content */}
      {!isMinimized && (
        <pre
          ref={preRef}
          className="p-3 sm:p-4 font-mono text-xs sm:text-sm overflow-auto"
          style={{ 
            maxHeight,
            minHeight: '150px',
            backgroundColor: '#0d1117',
            color: '#e6edf3'
          }}
        >
          {logs.length === 0 ? (
            <span className="text-gray-500 flex items-center gap-2">
              <span className="inline-block w-1.5 h-4 bg-gray-600 animate-pulse" />
              Waiting for logs...
            </span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {log}
              </div>
            ))
          )}
        </pre>
      )}
      
      {/* Footer */}
      {!isMinimized && logs.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-700 bg-gray-900/30 flex items-center justify-between text-xs text-gray-500">
          <span>{logs.length} lines</span>
          <span className="hidden sm:inline">{status === 'running' || status === 'failed' ? 'Complete' : 'Live'}</span>
        </div>
      )}
    </div>
  )
}