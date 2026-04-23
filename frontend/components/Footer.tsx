'use client'

import Link from 'next/link'
import { useTheme } from './ThemeProvider'

export default function Footer() {
  const { resolvedTheme } = useTheme()
  const currentYear = new Date().getFullYear()
  
  const logoSrc = resolvedTheme === 'dark' ? '/darkLogo.png' : '/lightLogo.png'
  
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src={logoSrc} alt="Smart Deploy" className="h-14 w-auto" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Deploy your applications with one click. Fast, reliable, and fully automated.
            </p>
          </div>
          
          {/* Product */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/projects" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/deployments" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Deployments
                </Link>
              </li>
              <li>
                <Link href="/projects/new" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  New Project
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Resources */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tech-stack" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Tech Stack
                </Link>
              </li>
              <li>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  GitHub Integration
                </a>
              </li>
              <li>
                <a 
                  href="https://docker.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Docker Hub
                </a>
              </li>
            </ul>
          </div>
          
          {/* Company */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/settings" className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Settings
                </Link>
              </li>
              <li>
                <a 
                  href="mailto:support@smartdeploy.app" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Copyright - Realtime Year */}
            <p className="text-xs text-gray-500 dark:text-gray-500 text-center sm:text-left">
              &copy; {currentYear} Smart Deploy. All rights reserved.
            </p>
            
            {/* Links */}
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                Privacy
              </Link>
              <a 
                href="https://github.com/Vortechlabs/smart-deploy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.42c-2.23.48-2.7-1.08-2.7-1.08-.36-.92-.89-1.16-.89-1.16-.73-.5.05-.49.05-.49.81.05 1.24.84 1.24.84.72 1.23 1.89.88 2.35.67.07-.52.28-.88.51-1.08-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.03 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}