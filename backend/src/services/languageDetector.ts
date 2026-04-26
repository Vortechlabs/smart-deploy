// backend/src/services/languageDetector.ts
import fs from 'fs/promises'
import path from 'path'

export type Runtime = 'node' | 'nextjs' | 'react' | 'vue' | 'express' | 'nestjs' | 'python' | 'go' | 'php' | 'rust' | 'static' | 'laravel' | 'unknown'

export type ProjectType = 'single' | 'monorepo-frontend' | 'monorepo-backend' | 'fullstack'

export interface ProjectStructure {
  type: ProjectType
  frontend?: {
    path: string
    runtime: Runtime
    port: number
  }
  backend?: {
    path: string
    runtime: Runtime
    port: number
    database?: DatabaseConfig
  }
  services: ServiceConfig[]
}

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'sqlite' | 'mongodb'
  version?: string
  port: number
  name?: string
  user?: string
  password?: string
}

export interface ServiceConfig {
  name: string
  type: 'mysql' | 'postgresql' | 'redis' | 'custom'
  version?: string
  port: number
}

export async function detectRuntime(repoPath: string): Promise<Runtime> {
  const files = await fs.readdir(repoPath)
  
  // PHP/Laravel detection
  if (files.includes('artisan')) return 'laravel'
  if (files.includes('composer.json')) {
    const composer = JSON.parse(await fs.readFile(path.join(repoPath, 'composer.json'), 'utf-8'))
    if (composer.require?.['laravel/framework']) return 'laravel'
    return 'php'
  }
  if (files.includes('index.php')) return 'php'
  
  // Node.js variants
  if (files.includes('package.json')) {
    try {
      const pkg = JSON.parse(await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }
      if (deps['next']) return 'nextjs'
      if (deps['react']) return 'react'
      if (deps['vue']) return 'vue'
      if (deps['express']) return 'express'
      if (deps['@nestjs/core']) return 'nestjs'
      return 'node'
    } catch {
      return 'node'
    }
  }
  
  // Python
  if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('Pipfile')) return 'python'
  if (files.includes('app.py') || files.includes('main.py')) return 'python'
  
  // Go
  if (files.includes('go.mod') || files.includes('main.go')) return 'go'
  
  // Rust
  if (files.includes('Cargo.toml')) return 'rust'
  
  // Static
  if (files.includes('index.html')) return 'static'
  
  return 'static'
}

export async function detectLanguage(repoPath: string): Promise<Runtime> {
  return detectRuntime(repoPath)
}

export async function analyzeProjectStructure(repoPath: string): Promise<ProjectStructure> {
  const files = await fs.readdir(repoPath)
  
  const hasFrontend = files.includes('frontend') || files.includes('client')
  const hasBackend = files.includes('backend') || files.includes('server') || files.includes('api')
  
  if (hasFrontend && hasBackend) {
    const frontendDir = files.includes('frontend') ? 'frontend' : 'client'
    const backendDir = files.includes('backend') ? 'backend' : files.includes('server') ? 'server' : 'api'
    
    const frontendRuntime = await detectRuntime(path.join(repoPath, frontendDir))
    const backendRuntime = await detectRuntime(path.join(repoPath, backendDir))
    
    const needsDatabase = backendRuntime === 'laravel' || backendRuntime === 'php' || backendRuntime === 'express' || backendRuntime === 'nestjs'
    
    return {
      type: 'fullstack',
      frontend: {
        path: frontendDir,
        runtime: frontendRuntime,
        port: frontendRuntime === 'static' ? 80 : 3000
      },
      backend: {
        path: backendDir,
        runtime: backendRuntime,
        port: backendRuntime === 'laravel' ? 8000 : backendRuntime === 'go' ? 8080 : 3001,
        database: needsDatabase ? {
          type: 'mysql',
          port: 3306,
          name: 'app_db',
          user: 'app_user',
          password: 'secret123'
        } : undefined
      },
      services: needsDatabase ? [
        {
          name: 'mysql',
          type: 'mysql',
          version: '8.0',
          port: 3306
        }
      ] : []
    }
  }
  
  const runtime = await detectRuntime(repoPath)
  const needsDatabase = runtime === 'laravel' || runtime === 'php'
  
  return {
    type: 'single',
    services: needsDatabase ? [
      {
        name: 'mysql',
        type: 'mysql',
        version: '8.0',
        port: 3306
      }
    ] : [],
    backend: {
      path: '.',
      runtime,
      port: runtime === 'laravel' ? 8000 : runtime === 'go' ? 8080 : runtime === 'static' ? 80 : 3000,
      database: needsDatabase ? {
        type: 'mysql',
        port: 3306,
        name: 'app_db',
        user: 'app_user',
        password: 'secret123'
      } : undefined
    }
  }
}