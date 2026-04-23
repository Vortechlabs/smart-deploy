import { Elysia } from 'elysia'
import { prisma } from '../lib/prisma'
import { triggerDeploy, getDeploymentLogs } from '../controllers/buildController'
import { analyzeBuildError } from '../services/geminiService'

export const deploymentsRoutes = new Elysia({ prefix: '/deployments' })
  
  // 🔥 Trigger deploy (POST /deployments/:id/deploy)
  .post('/:id/deploy', async ({ params, headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    
    const token = authHeader.substring(7)
    const user = await prisma.user.findFirst({ where: { githubToken: token } })
    
    if (!user) {
      set.status = 401
      return { error: 'User not found' }
    }
    
    const project = await prisma.project.findFirst({
      where: { id: params.id, userId: user.id }
    })
    
    if (!project) {
      set.status = 404
      return { error: 'Project not found' }
    }
    
    const deploymentId = await triggerDeploy(params.id, user.id, user.githubToken)
    return { deploymentId, message: 'Deployment started' }
  })
  
  // 🔥 Get deployment logs (GET /deployments/:id/logs)
  .get('/:id/logs', async ({ params }) => {
    const logs = await getDeploymentLogs(params.id)
    return { logs }
  })
  
  // 🔥 Analyze with AI (POST /deployments/:id/analyze)
  .post('/:id/analyze', async ({ params, headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    
    const token = authHeader.substring(7)
    const user = await prisma.user.findFirst({ where: { githubToken: token } })
    
    if (!user) {
      set.status = 401
      return { error: 'User not found' }
    }
    
    const deployment = await prisma.deployment.findFirst({
      where: { id: params.id, project: { userId: user.id } },
      select: { logs: true, status: true }
    })
    
    if (!deployment) {
      set.status = 404
      return { error: 'Deployment not found' }
    }
    
    if (deployment.status !== 'failed') {
      set.status = 400
      return { error: 'Can only analyze failed deployments' }
    }
    
    if (!deployment.logs) {
      set.status = 400
      return { error: 'No logs available' }
    }
    
    const aiSuggestion = await analyzeBuildError(deployment.logs)
    
    if (!aiSuggestion) {
      set.status = 500
      return { error: 'Failed to analyze error' }
    }
    
    await prisma.deployment.update({
      where: { id: params.id },
      data: { aiSuggestion }
    })
    
    return { success: true, aiSuggestion }
  })
  
  // 🔥 Get single deployment (GET /deployments/:id)
  .get('/:id', async ({ params }) => {
    const deployment = await prisma.deployment.findUnique({
      where: { id: params.id },
      include: { project: true }
    })
    
    if (!deployment) {
      return { error: 'Deployment not found' }
    }
    
    return deployment
  })