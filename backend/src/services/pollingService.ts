import { prisma } from '../lib/prisma'
import { triggerDeploy } from '../controllers/buildController'
import { GitHubService } from './githubService'

const POLL_INTERVAL = 2 * 60 * 1000 // 2 menit

export async function startPolling() {
  console.log('🔄 Starting GitHub polling service (every 2 minutes)...')
  
  const checkProjects = async () => {
    const projects = await prisma.project.findMany({
      where: { 
        status: 'running',
        autoDeploy: true,  // ← HANYA PROJECT DENGAN AUTODEPLOY ON
        repoUrl: { not: { startsWith: 'file://' } }
      },
      include: { user: true }
    })
    
    if (projects.length > 0) {
      console.log(`🔍 Checking ${projects.length} projects for new commits...`)
    }
    
    for (const project of projects) {
      try {
        const github = new GitHubService(project.user.githubToken)
        const latestCommit = await github.getLatestCommit(project.repoUrl, project.branch)
        
        const lastDeployment = await prisma.deployment.findFirst({
          where: { projectId: project.id },
          orderBy: { createdAt: 'desc' }
        })
        
        if (!lastDeployment || lastDeployment.commitHash !== latestCommit.hash) {
          console.log(`🆕 New commit for ${project.name}: ${latestCommit.hash}`)
          
          await triggerDeploy(
            project.id,
            project.user.id,
            project.user.githubToken
          )
        }
      } catch (error: any) {
        console.error(`❌ Polling error for ${project.name}:`, error.message)
      }
    }
  }
  
  await checkProjects()
  setInterval(checkProjects, POLL_INTERVAL)
}