import { Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { GitHubService } from '../services/githubService'
import { buildImage, pushImage } from '../services/dockerService'
import { deployToSwarm } from '../services/swarmDeployService'
import { detectLanguage, generateDockerfile } from '../services/languageDetector'
import { analyzeBuildError } from '../services/geminiService'
import path from 'path'
import fs from 'fs/promises'

const worker = new Worker('build-queue', async (job) => {
  const { deploymentId, projectId, repoUrl, branch, subdomain, port, githubToken, localPath } = job.data
  
  // 🔥 Cek apakah deployment exists
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId }
  })
  
  if (!deployment) {
    console.error(`❌ Deployment ${deploymentId} not found - skipping job`)
    return
  }
  
  const addLog = async (message: string) => {
    console.log(`[${deploymentId}] ${message.trim()}`)
    
    try {
      await prisma.buildLog.create({ data: { deploymentId, message } })
      const current = await prisma.deployment.findUnique({ where: { id: deploymentId } })
      if (current) {
        await prisma.deployment.update({
          where: { id: deploymentId },
          data: { logs: (current.logs || '') + message }
        })
      }
    } catch (e) {
      console.error('Log error:', e)
    }
  }
  
  try {
    await addLog(`🚀 Starting deployment for project ${projectId}\n`)
    
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'building' }
    }).catch(() => {})
    
    let repoPath: string
    const isLocalPath = localPath || repoUrl?.startsWith('file://')
    
    if (isLocalPath) {
      repoPath = localPath || repoUrl.replace('file://', '')
      await addLog(`📦 Using uploaded files from: ${repoPath}\n`)
      
      try {
        await fs.access(repoPath)
      } catch {
        throw new Error(`Local path does not exist: ${repoPath}`)
      }
      
    } else if (repoUrl && githubToken) {
      await addLog(`📦 Cloning from GitHub: ${repoUrl} (${branch})\n`)
      repoPath = path.join('/tmp', 'repos', `${projectId}-${Date.now()}`)
      
      const github = new GitHubService(githubToken)
      await github.cloneRepo(repoUrl, branch, repoPath)
      await addLog(`✅ Cloned successfully\n`)
      
    } else {
      throw new Error('No valid source provided')
    }
    
    // Detect language
    const runtime = await detectLanguage(repoPath)
    await addLog(`🔧 Detected runtime: ${runtime}\n`)
    
    const actualPort = runtime === 'static' ? 80 : (port || 3000)
    if (runtime === 'static') await addLog(`📌 Static site detected → using port 80\n`)
    
    // Generate Dockerfile
    const dockerfile = await generateDockerfile(runtime, actualPort)
    await fs.writeFile(path.join(repoPath, 'Dockerfile'), dockerfile)
    await addLog(`✅ Dockerfile generated\n`)
    
    // Build image
    await addLog(`🔨 Building Docker image...\n`)
    const imageName = await buildImage(projectId, repoPath, async (log) => addLog(log))

    // 🔥 Cek apakah build sukses (tidak ada error)
    if (!imageName) {
      throw new Error('Build failed - no image produced')
    }

    await addLog(`✅ Image built: ${imageName}\n`)
    
    // Push image
    await addLog(`📤 Pushing image to registry...\n`)
    await pushImage(imageName)
    await addLog(`✅ Image pushed to registry\n`)
    
    // Deploy to Docker Swarm
    await addLog(`🐳 Deploying to Docker Swarm with auto-scaling...\n`)
    await deployToSwarm(projectId, imageName, actualPort, subdomain)
    await addLog(`✅ Deployed successfully! (1-10 replicas, auto-scaling active)\n`)
    
    await prisma.deployment.update({ 
      where: { id: deploymentId }, 
      data: { status: 'running', finishedAt: new Date() } 
    })
    await prisma.project.update({ 
      where: { id: projectId }, 
      data: { status: 'running' } 
    })
    
    await addLog(`🎉 Live at: http://${subdomain}.localhost\n`)
    
    // Cleanup
    if (!isLocalPath) {
      await fs.rm(repoPath, { recursive: true, force: true }).catch(() => {})
      await addLog(`🧹 Cleaned up temporary files\n`)
    }

} catch (error: any) {
  const errorMessage = `❌ Deployment failed: ${error.message}\n`
  await addLog(errorMessage)
  
  // 🔥 HANYA update status failed, TANPA AI Analysis
  await prisma.deployment.update({ 
    where: { id: deploymentId }, 
    data: { status: 'failed', finishedAt: new Date() } 
  }).catch(() => {})
  
  await prisma.project.update({ 
    where: { id: projectId }, 
    data: { status: 'failed' } 
  }).catch(() => {})
  
  // 🔥 TIDAK PANGGIL AI ANALYSIS di sini!
}

}, { 
  connection: redis, 
  concurrency: 1,
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 100 }
})

worker.on('completed', (job) => console.log(`✅ Job ${job.id} completed`))
worker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message))

console.log('🚀 Build worker started (Docker Swarm + Auto-scaling)')