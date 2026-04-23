'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'  // ← IMPORT

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme, resolvedTheme } = useTheme()  // ← USE HOOK
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    theme: theme,  // ← SYNC WITH THEME
    notifications: true,
    autoDeploy: true,
  })
  
  // Update formData when theme changes externally
  useEffect(() => {
    setFormData(prev => ({ ...prev, theme }))
  }, [theme])
  
  // Fetch user settings
  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem('github_token')
      if (!token) {
        router.push('/')
        return
      }
      
      try {
        const res = await fetch('http://localhost:3000/settings', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
          
          // Load saved theme from backend
          const savedTheme = data.settings?.theme || 'system'
          setTheme(savedTheme)  // ← UPDATE GLOBAL THEME
          
          setFormData({
            username: data.user?.username || '',
            email: data.user?.email || '',
            theme: savedTheme,
            notifications: data.settings?.notifications ?? true,
            autoDeploy: data.settings?.autoDeploy ?? true,
          })
        } else {
          router.push('/')
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSettings()
  }, [router, setTheme])
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (name === 'theme') {
      setTheme(value as 'light' | 'dark' | 'system')  // ← UPDATE GLOBAL THEME IMMEDIATELY
    }
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }
  
  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage(null)
    
    const token = localStorage.getItem('github_token')
    
    try {
      const res = await fetch('http://localhost:3000/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
if (res.ok) {
  setUser(data.user)
  setMessage({ type: 'success', text: 'Settings saved successfully!' })
  
  // 🔥 Trigger event agar Navbar refresh
  window.dispatchEvent(new Event('user-updated'))
  // 🔥 Update localStorage
  localStorage.setItem('user', JSON.stringify(data.user))
}else {
        throw new Error(data.error || 'Failed to save settings')
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[#dae2ef] border-t-[#4072af] animate-spin" />
        <p className="text-sm text-[#4072af]/70">Loading settings...</p>
      </div>
    )
  }
  
  return (
    <div className="mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-medium text-[#102d4d] dark:text-[#dae2ef]">Settings</h1>
        <p className="text-sm text-[#4072af]/60 mt-0.5">Manage your account and application preferences</p>
      </div>
      
      {/* Theme Section - Realtime Preview */}
      <div className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dae2ef] dark:border-[#1e3a5f] bg-[#f9f7f8] dark:bg-[#0d1e2e]">
          <h2 className="text-base font-medium text-[#102d4d] dark:text-[#dae2ef]">Appearance</h2>
          <p className="text-xs text-[#4072af]/50 mt-0.5">Customize how Smart Deploy looks</p>
        </div>
        
        <div className="p-6">
          <div>
            <label className="block text-xs font-medium text-[#4072af] dark:text-[#7aa8d8] mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t)
                    setFormData(prev => ({ ...prev, theme: t }))
                  }}
                  className={`p-4 rounded-xl border-2 transition-all capitalize ${
                    theme === t
                      ? 'border-[#4072af] bg-[#4072af]/5'
                      : 'border-[#dae2ef] dark:border-[#1e3a5f] hover:border-[#4072af]/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {t === 'light' && (
                      <div className="w-8 h-8 rounded-full bg-white border border-[#dae2ef]" />
                    )}
                    {t === 'dark' && (
                      <div className="w-8 h-8 rounded-full bg-[#0f2035] border border-[#1e3a5f]" />
                    )}
                    {t === 'system' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white to-[#0f2035] border border-[#dae2ef]" />
                    )}
                    <span className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">{t}</span>
                    {theme === t && (
                      <span className="text-xs text-[#4072af]">Active</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-[#4072af]/40 mt-3">
              Current theme: <strong>{resolvedTheme}</strong>
            </p>
          </div>
        </div>
      </div>
      
      {/* Profile Section */}
      <div className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dae2ef] dark:border-[#1e3a5f] bg-[#f9f7f8] dark:bg-[#0d1e2e]">
          <h2 className="text-base font-medium text-[#102d4d] dark:text-[#dae2ef]">Profile</h2>
          <p className="text-xs text-[#4072af]/50 mt-0.5">Your GitHub account information</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-16 h-16 rounded-full border-2 border-[#dae2ef] dark:border-[#1e3a5f]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#dae2ef] dark:bg-[#102d4d] flex items-center justify-center">
                <span className="text-2xl font-medium text-[#4072af] dark:text-[#7aa8d8]">
                  {formData.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">{formData.username || 'User'}</p>
              <p className="text-xs text-[#4072af]/50">GitHub User</p>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[#4072af] dark:text-[#7aa8d8] mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-lg text-sm text-[#102d4d] dark:text-[#dae2ef] focus:outline-none focus:ring-2 focus:ring-[#4072af]/20 focus:border-[#4072af]"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-[#4072af] dark:text-[#7aa8d8] mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-lg text-sm text-[#102d4d] dark:text-[#dae2ef] focus:outline-none focus:ring-2 focus:ring-[#4072af]/20 focus:border-[#4072af]"
            />
          </div>
        </div>
      </div>
      
      {/* Auto Deploy Section */}
      <div className="bg-white dark:bg-[#0f2035] border border-[#dae2ef] dark:border-[#1e3a5f] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#dae2ef] dark:border-[#1e3a5f] bg-[#f9f7f8] dark:bg-[#0d1e2e]">
          <h2 className="text-base font-medium text-[#102d4d] dark:text-[#dae2ef]">Auto Deploy</h2>
          <p className="text-xs text-[#4072af]/50 mt-0.5">Automatic deployment settings</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-[#102d4d] dark:text-[#dae2ef]">Enable Auto Deploy for New Projects</p>
              <p className="text-xs text-[#4072af]/50">New projects will auto-deploy on every git push</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="autoDeploy"
                checked={formData.autoDeploy}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#dae2ef] dark:bg-[#1e3a5f] rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4072af]"></div>
            </label>
          </div>
          
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Auto-deploy checks for new commits every 2 minutes. No webhook setup required!
            </p>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-[#4072af] text-white hover:bg-[#3362a0] disabled:opacity-50 transition-all"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
      
      {/* Message Toast */}
      {message && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 ${
          message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  )
}