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
  const wsRef = useRef<WebSocket | null>(null)
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws/deploy/${deploymentId}`)
    wsRef.current = ws
    
    ws.onopen = () => {
      setConnected(true)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'history') {
          setLogs(data.logs.split('\n').filter((l: string) => l.trim()))
          setStatus(data.status)
        } else if (data.type === 'log') {
          setLogs(prev => [...prev, ...data.logs.split('\n').filter((l: string) => l.trim())])
        } else if (data.type === 'done') {
          setStatus(data.status)
          ws.close()
        }
      } catch {
        setLogs(prev => [...prev, event.data])
      }
    }
    
    ws.onerror = () => {
      setLogs(prev => [...prev, `[ERROR] Connection lost`])
      setConnected(false)
    }
    
    ws.onclose = () => {
      setConnected(false)
    }
    
    return () => ws.close()
  }, [deploymentId])
  
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
  
  const clearLogs = () => {
    setLogs([])
  }
  
  const copyLogs = () => {
    const text = logs.join('\n')
    navigator.clipboard.writeText(text)
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
    <div className="rounded-xl overflow-hidden border border-gray-700 dark:border-gray-600 bg-[#0d1117] dark:bg-[#0a0c10] shadow-xl">
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
          
          {/* Connection Status */}
          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor()}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${connected ? 'animate-pulse' : ''} bg-current`} />
            {status}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            title="Clear"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M4 4v7a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            onClick={copyLogs}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            title="Copy"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 10V3a1 1 0 011-1h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          <button
            onClick={downloadLogs}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
            title="Download"
          >
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
            <span className="text-gray-500 dark:text-gray-600 flex items-center gap-2">
              <span className="inline-block w-1.5 h-4 bg-gray-600 animate-pulse" />
              Waiting for logs...
            </span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                {log.split(/(\x1b\[[0-9;]*m)/).map((part, j) => {
                  // Simple ANSI color parsing (optional)
                  if (part.startsWith('\x1b')) return null
                  return <span key={j}>{part}</span>
                }) || log}
              </div>
            ))
          )}
        </pre>
      )}
      
      {/* Footer - Status Bar */}
      {!isMinimized && logs.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-700 dark:border-gray-600 bg-gray-900/30 flex items-center justify-between text-xs text-gray-500">
          <span>{logs.length} lines</span>
          <span className="hidden sm:inline">{autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}</span>
        </div>
      )}
    </div>
  )
}