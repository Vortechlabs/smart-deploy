import { Elysia } from 'elysia'
import { prisma } from '../lib/prisma'
import { Queue } from 'bullmq'
import { redis } from '../lib/redis'

const buildQueue = new Queue('build-queue', { connection: redis })

export const webhookRoutes = new Elysia({ prefix: '/webhook' })
  .post('/github', async ({ body, headers, set }) => {
    const event = headers['x-github-event']
    
    if (event !== 'push') {
      return { message: 'Ignored', event }
    }
    
    const repoFullName = body.repository?.full_name
    const branch = body.ref?.replace('refs/heads/', '')
    const commitHash = body.after?.substring(0, 7)
    const commitMsg = body.head_commit?.message
    const sender = body.sender?.login
    
    console.log(`📡 Webhook: ${repoFullName} -> ${branch} by ${sender}`)
    
    // Cari project berdasarkan repo URL
    const projects = await prisma.project.findMany({
      where: {
        repoUrl: { contains: repoFullName },
        branch: branch
      },
      include: { user: true }
    })
    
    if (projects.length === 0) {
      console.log(`⚠️ No project found for ${repoFullName}/${branch}`)
      return { message: 'No matching project' }
    }
    
    // Auto deploy untuk semua project yang match
    for (const project of projects) {
      console.log(`🚀 Auto-deploying ${project.name}`)
      
      const deployment = await prisma.deployment.create({
        data: {
          projectId: project.id,
          commitHash,
          commitMsg,
          status: 'pending'
        }
      })
      
      await prisma.project.update({
        where: { id: project.id },
        data: { status: 'building' }
      })
      
      await buildQueue.add('deploy', {
        deploymentId: deployment.id,
        projectId: project.id,
        repoUrl: project.repoUrl,
        branch: project.branch,
        subdomain: project.subdomain,
        port: project.port,
        githubToken: project.user?.githubToken
      })
    }
    
    return {
      message: `Auto-deployed ${projects.length} project(s)`,
      deployments: projects.map(p => p.name)
    }
  })
