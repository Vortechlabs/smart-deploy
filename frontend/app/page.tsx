'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
    const token = localStorage.getItem('github_token')
    setIsLoggedIn(!!token)
  }, [])
  
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID
    if (!clientId) {
      console.error("Missing GitHub Client ID")
      return
    }
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=http://41.216.191.42/api/auth/callback&scope=repo,user`
  }
  
  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <Navbar />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
              Deploy from GitHub in seconds
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
            Deploy your apps
            <span className="block text-blue-600 dark:text-blue-400">with a single click</span>
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Connect your GitHub repository and get a live URL instantly. 
            Automatic builds, custom subdomains, and real-time logs included.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/projects"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
                  <path d="M1 7h12M7 1v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={handleLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.42c-2.23.48-2.7-1.08-2.7-1.08-.36-.92-.89-1.16-.89-1.16-.73-.5.05-.49.05-.49.81.05 1.24.84 1.24.84.72 1.23 1.89.88 2.35.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                Continue with GitHub
              </button>
            )}
            
            <a
              href="#features"
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Learn more →
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to deploy
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Simple, fast, and reliable deployment platform for your projects.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'One-Click Deploy',
              description: 'Connect your GitHub repository and deploy instantly. No configuration needed.',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )
            },
            {
              title: 'Automatic Builds',
              description: 'Detects Node.js, Python, Go, or static sites and builds automatically.',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              )
            },
            {
              title: 'Real-time Logs',
              description: 'Watch your builds progress with live streaming logs via WebSocket.',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M8 12h8M8 8h6M8 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                </svg>
              )
            },
            {
              title: 'Custom Subdomains',
              description: 'Every project gets a unique subdomain for easy access and sharing.',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M2 12h20" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 2a15 15 0 010 20 15 15 0 010-20z" stroke="currentColor" strokeWidth="2" />
                </svg>
              )
            },
            {
              title: 'Auto-scaling',
              description: 'Automatically scales your apps based on CPU and memory usage.',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M3 17L7 13L11 17L18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M18 14v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )
            },
            {
              title: 'Docker & Kubernetes',
              description: 'Containerized deployments with Docker Swarm or Kubernetes.',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )
            }
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center p-8 sm:p-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to deploy your first project?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
            Join developers who deploy their applications with Smart Deploy.
          </p>
          
          {isLoggedIn ? (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              Create New Project
              <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h12M7 1v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </Link>
          ) : (
            <button
              onClick={handleLogin}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
            >
              Get Started
              <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}