import { Queue } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { GitHubService } from '../services/githubService'
import { v4 as uuidv4 } from 'uuid'

const buildQueue = new Queue('build-queue', { connection: redis })

export async function triggerDeploy(
  projectId: string,
  userId: string,
  githubToken: string,
  localPath?: string  // ← Tambahkan parameter untuk ZIP upload
): Promise<string> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  })
  
  if (!project) {
    throw new Error('Project not found')
  }
  
  let commitHash = 'local'
  let commitMsg = 'ZIP upload'
  
  // Hanya fetch commit dari GitHub jika bukan local file
  if (!project.repoUrl.startsWith('file://') && !localPath) {
    try {
      const github = new GitHubService(githubToken)
      const commit = await github.getLatestCommit(project.repoUrl, project.branch)
      commitHash = commit.hash
      commitMsg = commit.message
    } catch (error) {
      console.warn('⚠️ Could not fetch commit info, using defaults')
    }
  }
  
  const deployment = await prisma.deployment.create({
    data: {
      id: uuidv4(),
      projectId,
      commitHash,
      commitMsg,
      status: 'pending'
    }
  })
  
  // Update project status
  await prisma.project.update({
    where: { id: projectId },
    data: { status: 'building' }
  })
  
  // Add to queue - sertakan localPath jika ada
  await buildQueue.add('deploy', {
    deploymentId: deployment.id,
    projectId,
    repoUrl: project.repoUrl,
    branch: project.branch,
    subdomain: project.subdomain,
    port: project.port,
    githubToken,
    localPath: localPath || (project.repoUrl.startsWith('file://') ? project.repoUrl.replace('file://', '') : undefined)
  })
  
  return deployment.id
}

export async function getDeploymentLogs(deploymentId: string): Promise<string> {
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId }
  })
  
  return deployment?.logs || ''
}

export async function addBuildLog(deploymentId: string, message: string) {
  await prisma.buildLog.create({
    data: {
      deploymentId,
      message
    }
  })
  
  const deployment = await prisma.deployment.findUnique({
    where: { id: deploymentId }
  })
  
  const currentLogs = deployment?.logs || ''
  await prisma.deployment.update({
    where: { id: deploymentId },
    data: { logs: currentLogs + message }
  })
}