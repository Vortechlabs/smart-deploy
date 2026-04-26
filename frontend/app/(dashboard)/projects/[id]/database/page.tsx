'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function DatabasePage() {
  const { id } = useParams()
  const [db, setDb] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const [subdomain, setSubdomain] = useState('')

  // Fetch project buat dapetin subdomain
  useEffect(() => {
    const fetchProject = async () => {
      const token = localStorage.getItem('github_token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      try {
        const res = await fetch(`${apiBase}/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const project = await res.json()
          setSubdomain(project.subdomain)
        }
      } catch {}
    }
    fetchProject()
  }, [id])
  
  const fetchDatabase = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('github_token')
      if (!token) {
        setError('Please login first')
        setLoading(false)
        return
      }
      
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const res = await fetch(`${apiBase}/databases/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }
      
      const data = await res.json()
      setDb(data)
    } catch (err: any) {
      console.error('Failed to fetch database:', err)
      setError(err.message || 'Failed to load database info')
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => { 
    if (id) fetchDatabase() 
  }, [id])
  
  const handleProvision = async (dbType: string) => {
    setProvisioning(true)
    setError(null)
    try {
      const token = localStorage.getItem('github_token')
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      
      const res = await fetch(`${apiBase}/databases/${id}/provision`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dbType })
      })
      
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to provision database')
      }
      
      await fetchDatabase()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProvisioning(false)
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
        <span className="ml-3 text-sm text-gray-500">Loading database info...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <Link href={`/projects/${id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Project
        </Link>
        <div className="mt-6 p-6 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchDatabase} className="mt-3 text-sm underline">Retry</button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <Link href={`/projects/${id}`} className="text-sm text-blue-600 hover:underline">
        ← Back to Project
      </Link>
      
      <h1 className="text-2xl font-medium">Database Management</h1>
      
      {!db?.provisioned ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 border text-center space-y-4">
          <p className="text-lg">No database provisioned yet</p>
          <p className="text-sm text-gray-500">Choose your database type:</p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => handleProvision('mysql')}
              disabled={provisioning}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              🐬 MySQL
            </button>
            <button
              onClick={() => handleProvision('postgresql')}
              disabled={provisioning}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
            >
              🐘 PostgreSQL
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Connection Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border">
            <h2 className="font-medium mb-4">Connection Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="font-mono">{db.type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Host</p>
                <p className="font-mono">{db.host}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Port</p>
                <p className="font-mono">{db.port}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Database</p>
                <p className="font-mono">{db.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Username</p>
                <p className="font-mono">{db.user}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Password</p>
                <p className="font-mono">{db.password}</p>
              </div>
            </div>
            
            <button
              onClick={() => navigator.clipboard.writeText(`
DB_CONNECTION=${db.type}
DB_HOST=${db.host}
DB_PORT=${db.port}
DB_DATABASE=${db.name}
DB_USERNAME=${db.user}
DB_PASSWORD=${db.password}`)}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
            >
              📋 Copy as .env
            </button>
          </div>
          
          {/* phpMyAdmin Access */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border">
            <h2 className="font-medium mb-2">phpMyAdmin</h2>
            <p className="text-sm text-gray-500 mb-3">Manage your database with phpMyAdmin</p>
            
{db.type === 'mysql' && (
  <a
    href={`http://${subdomain}.localhost/pma/`}
    target="_blank"
    className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
  >
    🗄️ Open phpMyAdmin
  </a>
)}
            
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
              <p>Server: <code>{db.host}</code></p>
              <p>Username: <code>{db.user}</code></p>
              <p>Password: <code>{db.password}</code></p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}