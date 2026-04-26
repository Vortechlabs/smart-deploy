'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api, getApiBaseUrl } from '@/lib/api'

type SourceType = 'github' | 'zip'

export default function NewProjectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('github')
  
  // Subdomain availability state
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [subdomainError, setSubdomainError] = useState<string | null>(null)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  
  // State untuk GitHub
  const [repos, setRepos] = useState<any[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [loadingRepos, setLoadingRepos] = useState(true)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState<any>(null)
  
  // State untuk ZIP upload
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [sqlFile, setSqlFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Get domain suffix based on environment
  const getDomainSuffix = () => {
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' ? '.localhost' : '.qode.my.id'
    }
    return '.localhost'
  }
  
  const [formData, setFormData] = useState({
    name: '',
    repoUrl: '',
    repoFullName: '',
    branch: 'main',
    subdomain: '',
    port: 80
  })
  
  // Check subdomain availability

const checkSubdomainAvailability = async (subdomain: string) => {
  if (!subdomain || subdomain.length < 3) {
    setSubdomainStatus('idle')
    setSubdomainError(null)
    return
  }
  
  // Validasi format subdomain
  const subdomainRegex = /^[a-z0-9-]+$/
  if (!subdomainRegex.test(subdomain)) {
    setSubdomainStatus('idle')
    setSubdomainError('Only lowercase letters, numbers, and hyphens allowed')
    return
  }
  
  setSubdomainStatus('checking')
  setSubdomainError(null)
  
  try {
    const token = localStorage.getItem('github_token')
    const apiBase = getApiBaseUrl()
    
    const response = await fetch(`${apiBase}/projects/check-subdomain?subdomain=${subdomain}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    if (data.available) {
      setSubdomainStatus('available')
    } else {
      setSubdomainStatus('taken')
      setSubdomainError('This subdomain is already taken')
    }
  } catch (err: any) {
    console.error('Failed to check subdomain:', err)
    if (err.message === 'Failed to fetch') {
      setSubdomainError('Cannot connect to backend. Is the server running?')
    } else {
      setSubdomainError(err.message)
    }
    setSubdomainStatus('idle')
  }
}
  
  // Debounced subdomain check
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
    
    setFormData({
      ...formData,
      subdomain: value
    })
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    // Set new timer for debouncing (500ms delay)
    if (value.length >= 3) {
      debounceTimer.current = setTimeout(() => {
        checkSubdomainAvailability(value)
      }, 500)
    } else {
      setSubdomainStatus('idle')
      setSubdomainError(null)
    }
  }
  
  // Ambil daftar repositori dari GitHub
  useEffect(() => {
    if (sourceType === 'github') {
      fetchRepos()
    }
  }, [sourceType])
  
  const fetchRepos = async () => {
    const token = localStorage.getItem('github_token')
    if (!token) {
      setError('Please login first')
      setLoadingRepos(false)
      return
    }
    
    setLoadingRepos(true)
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRepos(data)
      } else {
        throw new Error('Failed to fetch repos')
      }
    } catch (err) {
      console.error('Error fetching repos:', err)
      setError('Failed to load repositories')
    } finally {
      setLoadingRepos(false)
    }
  }
  
  // Ambil daftar branch dari repo yang dipilih
  const fetchBranches = async (repoFullName: string) => {
    setLoadingBranches(true)
    const token = localStorage.getItem('github_token')
    
    try {
      const response = await fetch(`https://api.github.com/repos/${repoFullName}/branches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const branchNames = data.map((b: any) => b.name)
        setBranches(branchNames)
        
        const defaultBranch = branchNames.includes('main') ? 'main' : 
                              branchNames.includes('master') ? 'master' : branchNames[0]
        setFormData(prev => ({ ...prev, branch: defaultBranch }))
      }
    } catch (err) {
      console.error('Error fetching branches:', err)
    } finally {
      setLoadingBranches(false)
    }
  }
  
  // Handler ketika repo dipilih
  const handleRepoSelect = (repo: any) => {
    setSelectedRepo(repo)
    const repoUrl = repo.html_url
    const repoFullName = repo.full_name
    const repoName = repo.name
    const defaultPort = repo.has_pages ? 80 : 3000
    
    const subdomain = repoName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '')
    
    setFormData({
      ...formData,
      repoUrl,
      repoFullName,
      name: repoName,
      subdomain,
      port: defaultPort
    })
    
    // Check availability for auto-generated subdomain
    if (subdomain.length >= 3) {
      checkSubdomainAvailability(subdomain)
    }
    
    fetchBranches(repoFullName)
  }
  
  // Handler untuk upload ZIP
const handleZipUpload = async () => {
  if (!zipFile) return
  
  setUploadProgress(0)
  const token = localStorage.getItem('github_token')
  const apiBase = getApiBaseUrl()
  
  const interval = setInterval(() => {
    setUploadProgress(prev => {
      if (prev >= 90) {
        clearInterval(interval)
        return 90
      }
      return prev + 10
    })
  }, 200)
  
  try {
    const formDataUpload = new FormData()
    formDataUpload.append('file', zipFile)
    formDataUpload.append('projectName', formData.name)
    formDataUpload.append('subdomain', formData.subdomain)
    formDataUpload.append('port', String(formData.port))
    
    // Append SQL file if exists
    if (sqlFile) {
      formDataUpload.append('sqlFile', sqlFile)
    }
    
    
    const response = await fetch(`${apiBase}/projects/upload-zip`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData, browser will set it with boundary
      },
      body: formDataUpload
    })
    
    clearInterval(interval)
    setUploadProgress(100)
    
    if (response.ok) {
      const project = await response.json()
      router.push(`/projects/${project.id}`)
    } else {
      const error = await response.json()
      throw new Error(error.error || 'Upload failed')
    }
  } catch (err: any) {
    clearInterval(interval)
    setError(err.message || 'Failed to upload zip file')
    setUploadProgress(0)
  }
}

  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check subdomain availability before submit
    if (subdomainStatus === 'taken') {
      setError('Subdomain is already taken. Please choose another.')
      return
    }
    
    if (sourceType === 'zip') {
      await handleZipUpload()
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const dataToSend = {
        name: formData.name,
        repoUrl: formData.repoUrl,
        branch: formData.branch,
        subdomain: formData.subdomain,
        port: Number(formData.port)
      }
      
      const project = await api.projects.create(dataToSend)
      router.push(`/projects/${project.id}`)
    } catch (err: any) {
      console.error("Create error:", err)
      setError(err.message || 'Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'port' ? parseInt(value) || 80 : value
    })
  }
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    const subdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
    
    setFormData({
      ...formData,
      name,
      subdomain
    })
    
    // Check availability for generated subdomain
    if (subdomain.length >= 3) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        checkSubdomainAvailability(subdomain)
      }, 500)
    }
  }
  
  // Cleanup timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])
  
  return (
    <div className="mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/projects" className="p-2 rounded-lg hover:bg-[#dae2ef] dark:hover:bg-[#102d4d] transition-colors">
            <svg className="w-5 h-5 text-[#4072af] dark:text-[#7aa8d8]" viewBox="0 0 12 12" fill="none">
              <path d="M7.5 2.5L4 6l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <h1 className="text-2xl font-medium text-[#102d4d] dark:text-[#dae2ef]">Create New Project</h1>
        </div>
        <p className="text-sm text-[#4072af]/60 dark:text-[#7aa8d8]/60 ml-11">
          Deploy your application from GitHub or upload a ZIP file
        </p>
      </div>

      {/* Pilihan Sumber */}
      <div className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl p-6 mb-6">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setSourceType('github')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
              sourceType === 'github'
                ? 'bg-[#4072af] text-white shadow-md'
                : 'bg-[#f9f7f8] dark:bg-[#0d1e2e] text-[#4072af] dark:text-[#7aa8d8] border border-[#dae2ef] dark:border-[#1e3a5f] hover:bg-[#dae2ef]/40'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 1a6 6 0 0 0-2 11.6c.3.1.4-.1.4-.3v-1c-1.6.3-2-1-2-1-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.6 0 1 .7 1 .7.6 1 1.5.7 1.9.5.1-.4.2-.7.4-.9-1.4-.2-2.9-.7-2.9-3.2 0-.7.3-1.3.7-1.8-.1-.2-.3-.9.1-1.8 0 0 .6-.2 1.8.7a6 6 0 0 1 3.3 0c1.2-.9 1.8-.7 1.8-.7.4.9.2 1.6.1 1.8.4.5.7 1.1.7 1.8 0 2.5-1.5 3-2.9 3.2.2.2.4.5.4 1v1.5c0 .2.1.4.4.3A6 6 0 0 0 7 1z"/>
            </svg>
            GitHub Repository
          </button>
          <button
            type="button"
            onClick={() => setSourceType('zip')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
              sourceType === 'zip'
                ? 'bg-[#4072af] text-white shadow-md'
                : 'bg-[#f9f7f8] dark:bg-[#0d1e2e] text-[#4072af] dark:text-[#7aa8d8] border border-[#dae2ef] dark:border-[#1e3a5f] hover:bg-[#dae2ef]/40'
            }`}
          >
            <svg className="w-5 h-5 inline mr-2" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
              <path d="M2 4h10M2 10h10M4 1v12M10 1v12" stroke="currentColor" strokeLinecap="round"/>
            </svg>
            Upload ZIP File
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* SOURCE: GITHUB */}
          {sourceType === 'github' && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
                  Select Repository <span className="text-red-500 ml-1">*</span>
                </label>
                
                {loadingRepos ? (
                  <div className="flex items-center gap-3 p-4 bg-[#f9f7f8] dark:bg-[#0d1e2e] rounded-xl">
                    <div className="w-4 h-4 rounded-full border-2 border-[#4072af]/30 border-t-[#4072af] animate-spin" />
                    <span className="text-sm text-[#4072af]/60">Loading your repositories...</span>
                  </div>
                ) : repos.length === 0 ? (
                  <div className="p-4 bg-[#f9f7f8] dark:bg-[#0d1e2e] rounded-xl">
                    <p className="text-sm text-[#4072af]/60">No repositories found.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {repos.map((repo) => (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => handleRepoSelect(repo)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedRepo?.id === repo.id
                            ? 'bg-[#4072af]/5 border-[#4072af] dark:border-[#7aa8d8]'
                            : 'bg-[#f9f7f8] dark:bg-[#0d1e2e] border-[#dae2ef] dark:border-[#1e3a5f] hover:border-[#4072af]/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-[#102d4d] dark:text-[#dae2ef]">{repo.full_name}</p>
                            <p className="text-xs text-[#4072af]/50 mt-0.5">{repo.description || 'No description'}</p>
                          </div>
                          {selectedRepo?.id === repo.id && (
                            <svg className="w-5 h-5 text-[#4072af]" viewBox="0 0 14 14" fill="none">
                              <path d="M11.5 3.5L5 10L2.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedRepo && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
                    Branch
                  </label>
                  {loadingBranches ? (
                    <div className="flex items-center gap-3 p-3 bg-[#f9f7f8] dark:bg-[#0d1e2e] rounded-xl">
                      <div className="w-4 h-4 rounded-full border-2 border-[#4072af]/30 border-t-[#4072af] animate-spin" />
                      <span className="text-sm text-[#4072af]/60">Loading branches...</span>
                    </div>
                  ) : (
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-xl text-sm"
                    >
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>{branch}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </>
          )}

          {/* SOURCE: ZIP UPLOAD */}
          {sourceType === 'zip' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
                Upload ZIP File <span className="text-red-500 ml-1">*</span>
              </label>
              
              <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                zipFile ? 'border-[#4072af] bg-[#4072af]/5' : 'border-[#dae2ef] dark:border-[#1e3a5f]'
              }`}>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="zip-upload"
                />
                <label htmlFor="zip-upload" className="cursor-pointer block">
                  {zipFile ? (
                    <div className="space-y-2">
                      <svg className="w-12 h-12 text-[#4072af] mx-auto" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4h10M2 10h10M4 1v12M10 1v12" stroke="currentColor" strokeWidth="1.3"/>
                      </svg>
                      <p className="font-medium text-[#102d4d] dark:text-[#dae2ef]">{zipFile.name}</p>
                      <p className="text-xs text-[#4072af]/50">
                        {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full bg-[#dae2ef] dark:bg-[#1e3a5f] rounded-full h-2 mt-2">
                          <div className="bg-[#4072af] h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg className="w-12 h-12 text-[#4072af]/40 mx-auto" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                        <path d="M2 4h10M2 10h10M4 1v12M10 1v12" stroke="currentColor"/>
                      </svg>
                      <p className="text-[#4072af]/60">Click to upload or drag and drop</p>
                      <p className="text-xs text-[#4072af]/40">ZIP file only (max 50MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
              Project Name <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              required
              className="w-full px-4 py-2.5 bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-xl text-sm"
              placeholder="my-awesome-app"
            />
          </div>

          {/* Subdomain dengan Real-time Validation */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
              Subdomain <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="subdomain"
                value={formData.subdomain}
                onChange={handleSubdomainChange}
                required
                className={`w-full px-4 py-2.5 bg-white dark:bg-[#0f2035] border rounded-xl text-sm pr-24 ${
                  subdomainStatus === 'available' 
                    ? 'border-green-500 dark:border-green-600' 
                    : subdomainStatus === 'taken'
                    ? 'border-red-500 dark:border-red-600'
                    : 'border-[#dae2ef] dark:border-[#1e3a5f]'
                }`}
                placeholder="myapp"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#4072af]/50">{getDomainSuffix()}</span>
              
              {/* Status Indicator */}
              {subdomainStatus === 'checking' && (
                <div className="absolute right-20 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full border-2 border-[#4072af]/30 border-t-[#4072af] animate-spin" />
                </div>
              )}
              
              {subdomainStatus === 'available' && (
                <div className="absolute right-20 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              
              {subdomainStatus === 'taken' && (
                <div className="absolute right-20 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            
            {/* Validation Message */}
            {subdomainError && (
              <p className="text-xs text-red-500 mt-1">{subdomainError}</p>
            )}
            
            {subdomainStatus === 'available' && (
              <p className="text-xs text-green-500 mt-1">✓ Subdomain is available!</p>
            )}
            
            <p className="text-xs text-[#4072af]/50 mt-1">
              {formData.subdomain.length < 3 
                ? 'At least 3 characters' 
                : 'Only lowercase letters, numbers, and hyphens'}
            </p>
          </div>

          {/* Port */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
              Port
            </label>
            {/* Port - Auto-detected by system */}
            <input type="hidden" name="port" value={formData.port} />
            <p className="text-xs text-[#4072af]/50">Port auto-detected based on project type</p>
            <p className="text-xs text-[#4072af]/50">Static sites: 80 | Node.js: 3000 | Laravel: 8000</p>
          </div>

          {/* Database Options */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-wider uppercase text-[#4072af] dark:text-[#7aa8d8]">
              Database Import (Optional)
            </label>
            <div className="border-2 border-dashed rounded-xl p-6 text-center border-[#dae2ef] dark:border-[#1e3a5f]">
              <input
                type="file"
                accept=".sql,.sql.gz,.dump"
                onChange={(e) => setSqlFile(e.target.files?.[0] || null)}
                className="hidden"
                id="sql-upload"
              />
              <label htmlFor="sql-upload" className="cursor-pointer block">
                {sqlFile ? (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 text-[#4072af] mx-auto" viewBox="0 0 14 14" fill="none">
                      <path d="M2 4h10M2 10h10M4 1v12M10 1v12" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                    <p className="font-medium text-sm">{sqlFile.name}</p>
                    <p className="text-xs text-[#4072af]/50">
                      {(sqlFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setSqlFile(null)
                      }}
                      className="text-xs text-red-500 hover:underline mt-1"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 text-[#4072af]/40 mx-auto" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                      <path d="M2 4h10M2 10h10M4 1v12M10 1v12" stroke="currentColor"/>
                    </svg>
                    <p className="text-sm text-[#4072af]/60">Upload SQL dump (optional)</p>
                    <p className="text-xs text-[#4072af]/40">.sql, .sql.gz, .dump</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Preview */}
          {formData.subdomain && subdomainStatus === 'available' && (
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium tracking-wider uppercase text-green-600 dark:text-green-400 mb-2">Preview URL</p>
              <code className="font-mono text-sm text-green-700 dark:text-green-300">
                http://{formData.subdomain}{getDomainSuffix()}
              </code>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={
              loading || 
              (sourceType === 'github' && !selectedRepo) || 
              (sourceType === 'zip' && !zipFile) || 
              subdomainStatus === 'taken' || 
              subdomainStatus === 'checking'
            }
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-[#4072af] text-white hover:bg-[#3362a0] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}