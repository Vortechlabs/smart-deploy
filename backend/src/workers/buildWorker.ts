// backend/src/workers/buildWorker.ts
import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { GitHubService } from '../services/githubService'
import { detectRuntime, analyzeProjectStructure } from '../services/languageDetector'
import { generateDockerfile } from '../services/dockerComposeGenerator'
import { getDomain } from '../config/domain'
import { provisionDatabase } from '../services/databaseService'
import { deployToSwarm } from '../services/swarmDeployService'
import path from 'path'
import fs from 'fs/promises'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import os from 'os'

const execAsync = promisify(exec)
const REGISTRY = 'localhost:5000'
const BASE_DIR = path.join(os.homedir(), '.smartdeploy', 'repos')

function findAvailablePort(startPort = 30000, endPort = 31000): number {
  const used = new Set<number>()
  try {
    const { stdout } = execSync('docker service ls --format "{{.Ports}}"')
    stdout.match(/:(\d+)->/g)?.forEach(m => used.add(parseInt(m.replace(/[^0-9]/g, ''))))
  } catch {}
  for (let p = startPort; p <= endPort; p++) { if (!used.has(p)) return p }
  return startPort + Math.floor(Math.random() * 1000)
}

function getActualPort(runtime: string, port: number): number {
  switch (runtime) { case 'php': case 'laravel': case 'static': return 80; case 'go': return 8080; default: return port || 3000 }
}

async function waitForMySQL(projectId: string): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    try {
      await execAsync(`docker exec $(docker ps --filter "name=db-${projectId}" --format "{{.ID}}" | head -1) mysqladmin ping -uroot -prootpassword --silent`)
      return true
    } catch { await new Promise(r => setTimeout(r, 2000)) }
  }
  return false
}

async function getContainerId(serviceName: string): Promise<string> {
  const { stdout } = await execAsync(`docker ps --filter "name=${serviceName}" --format "{{.ID}}" | head -1`)
  return stdout.trim()
}

async function setupLaravel(projectId: string, dbCredentials?: any): Promise<string> {
  try {
    const containerId = await getContainerId(`app-${projectId}`)
    if (!containerId) return '⚠️ Container not found'

    // Fix permissions
    await execAsync(`docker exec ${containerId} chmod -R 777 /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null`)

    // Build .env with MySQL DEFAULT
    const dbHost = `db-${projectId}`
    const envVars = [
      'APP_NAME=Laravel', 'APP_ENV=local', 'APP_DEBUG=true',
      'APP_URL=http://localhost', 'APP_KEY=',
      'DB_CONNECTION=mysql',
      `DB_HOST=${dbCredentials?.host || dbHost}`,
      `DB_PORT=${dbCredentials?.port || 3306}`,
      `DB_DATABASE=${dbCredentials?.name || 'laravel_db'}`,
      `DB_USERNAME=${dbCredentials?.user || 'root'}`,
      `DB_PASSWORD=${dbCredentials?.password || 'rootpassword'}`,
    ]

    const tmpEnv = `/tmp/env-${containerId}`
    await fs.writeFile(tmpEnv, envVars.join('\n'))
    await execAsync(`docker cp ${tmpEnv} ${containerId}:/var/www/html/.env`)
    await execAsync(`docker exec ${containerId} php artisan key:generate --force 2>/dev/null`)
    await execAsync(`docker exec ${containerId} php artisan config:clear 2>/dev/null`)
    await execAsync(`docker exec ${containerId} php artisan cache:clear 2>/dev/null`)
    await execAsync(`docker exec ${containerId} php artisan view:clear 2>/dev/null`)

    if (dbCredentials) {
      try { await execAsync(`docker exec ${containerId} php artisan migrate --force 2>/dev/null`) } catch {}
    }

    return '✅ Laravel setup done'
  } catch (e: any) { return `⚠️ ${e.message}` }
}

const worker = new Worker('build-queue', async (job) => {
  const { deploymentId, projectId, repoUrl, branch, subdomain, port, githubToken, localPath, sqlFile } = job.data

  const addLog = async (m: string) => {
    console.log(`[${deploymentId}] ${m.trim()}`)
    try {
      await prisma.buildLog.create({ data: { deploymentId, message: m } })
      const d = await prisma.deployment.findUnique({ where: { id: deploymentId } })
      if (d) await prisma.deployment.update({ where: { id: deploymentId }, data: { logs: (d.logs || '') + m } })
    } catch {}
  }

  try {
    const domain = getDomain()
    await addLog(`🚀 ${subdomain}.${domain}\n`)
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'building' } })

    // Ensure base dir
    await execAsync(`mkdir -p ${BASE_DIR}`)

    // 1. CLONE
    const repoPath = localPath || path.join(BASE_DIR, `${projectId}-${Date.now()}`)
    if (!localPath) {
      await addLog(`📦 Cloning...\n`)
      await new GitHubService(githubToken).cloneRepo(repoUrl, branch, repoPath)
      await addLog(`✅ Cloned\n`)
    }

    // 2. AUTO-FIX PHP localhost → mysql
    try {
      const { stdout: phpFiles } = await execAsync(`find ${repoPath} -name "*.php" -type f`)
      if (phpFiles.trim()) for (const file of phpFiles.split('\n').filter(Boolean)) {
        try { let c = await fs.readFile(file, 'utf-8'); if (c.includes('localhost')) { c = c.replace(/['"]localhost['"]/g, "'mysql'"); await fs.writeFile(file, c) } } catch {}
      }
    } catch {}

    // 3. ANALYZE
    const structure = await analyzeProjectStructure(repoPath)
    const actualPort = getActualPort(structure.backend!.runtime, port)
    await addLog(`📊 ${structure.backend!.runtime} | Port: ${actualPort}\n`)

    // 4. GENERATE DOCKERFILE
    await fs.writeFile(path.join(repoPath, 'Dockerfile'), await generateDockerfile(structure.backend!.runtime, port))

    // 5. BUILD & PUSH IMAGE
    const imageTag = `${REGISTRY}/paas/${projectId}:latest`
    await addLog(`🔨 Building image...\n`)
    await addLog((await execAsync(`docker build -t ${imageTag} ${repoPath}`)).stdout)
    await addLog((await execAsync(`docker push ${imageTag}`)).stdout)
    await addLog(`✅ Image: ${imageTag}\n`)

    // 6. DEPLOY TO SWARM
    await addLog(`🐳 Deploying to Swarm...\n`)
    const result = await deployToSwarm(projectId, imageTag, actualPort, subdomain)
    await addLog(`✅ Swarm: ${result.serviceName} | Port: ${result.port}\n`)

    // 7. DATABASE (MySQL DEFAULT - NOT SQLITE!)
    if (structure.services.length > 0) {
      await addLog(`🗄️ Database...\n`)
      const dbServiceName = `db-${projectId}`

      try {
        await execAsync(`docker service rm ${dbServiceName} 2>/dev/null || true`)
        await new Promise(r => setTimeout(r, 2000))
        await execAsync(`docker service create --name ${dbServiceName} --network smartdeploy-net ` +
          `--restart-condition any ` +
          `-e MYSQL_ROOT_PASSWORD=rootpassword ` +
          `-e MYSQL_DATABASE=${path.basename(repoPath).replace(/[^a-zA-Z0-9_]/g, '_')}_db ` +
          `--mount type=volume,source=mysql-${projectId},target=/var/lib/mysql ` +
          `mysql:8.0`)
      } catch (e: any) { await addLog(`⚠️ DB: ${e.message}\n`) }

      // Provision user + Setup Laravel
      if (await waitForMySQL(projectId)) {
        try {
          const credentials = await provisionDatabase(projectId, path.basename(repoPath), 'mysql')
          await addLog(`✅ DB: ${credentials.name} | User: ${credentials.user}\n`)

          if (structure.backend?.runtime === 'laravel') {
            await addLog(`🔧 Laravel...\n`)
            await addLog(`${await setupLaravel(projectId, credentials)}\n`)
          }
        } catch (e: any) { await addLog(`⚠️ DB User: ${e.message}\n`) }
      } else {
        await addLog(`⚠️ MySQL not ready, retrying in background...\n`)
        setTimeout(async () => {
          try {
            if (await waitForMySQL(projectId)) {
              const credentials = await provisionDatabase(projectId, path.basename(repoPath), 'mysql')
              if (structure.backend?.runtime === 'laravel') await setupLaravel(projectId, credentials)
            }
          } catch {}
        }, 30000)
      }
    } else {
      // No DB, just setup Laravel
      if (structure.backend?.runtime === 'laravel') {
        await addLog(`🔧 Laravel (no DB)...\n`)
        await addLog(`${await setupLaravel(projectId)}\n`)
      }
    }

    // 8. PHPMYADMIN
    if (structure.services.some(s => s.type === 'mysql')) {
      try {
        await execAsync(`docker service rm pma-${projectId} 2>/dev/null || true`)
        await execAsync(`docker service create --name pma-${projectId} --network smartdeploy-net ` +
          `-p ${result.port + 1}:80 -e PMA_HOST=db-${projectId} phpmyadmin/phpmyadmin`)
        await addLog(`🗄️ phpMyAdmin: http://localhost:${result.port + 1}\n`)
      } catch {}
    }

    // 9. DONE
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'running', finishedAt: new Date() } })
    await addLog(`🎉 http://${subdomain}.${domain}\n`)

  } catch (error: any) {
    await addLog(`❌ ${error.message}\n`)
    await prisma.deployment.update({ where: { id: deploymentId }, data: { status: 'failed', finishedAt: new Date() } }).catch(() => {})
    await prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } }).catch(() => {})
  }
}, { connection: redis, concurrency: 1 })

console.log('🐳 Build worker started (Docker Swarm + Auto DB + Auto .env)')