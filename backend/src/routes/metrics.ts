import { Elysia, t } from 'elysia'
import { exec } from 'child_process'
import { promisify } from 'util'
import { prisma } from '../lib/prisma'
import Docker from 'dockerode'

const execAsync = promisify(exec)
const docker = new Docker()

interface ContainerStats {
  name: string
  cpu: number
  memory: number
  memoryUsage: number
  memoryLimit: number
  networkRx: number
  networkTx: number
  status: string
  replicas?: number
}

export const metricsRoutes = new Elysia({ prefix: '/metrics' })
  
  // Get metrics for all running projects
  .get('/all', async ({ headers, set }) => {
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
    
    const projects = await prisma.project.findMany({
      where: { 
        userId: user.id,
        status: 'running'
      }
    })
    
    const stats: ContainerStats[] = []
    
    for (const project of projects) {
      try {
        // Coba dapatkan dari Docker Swarm service
        const serviceName = `app-${project.id}`
        const { stdout } = await execAsync(`docker service ps ${serviceName} --format "{{.CurrentState}}" 2>/dev/null | head -1`)
        
        if (stdout && stdout.includes('Running')) {
          // Get service details
          const { stdout: inspectOut } = await execAsync(`docker service inspect ${serviceName} --format '{{json .Spec.Mode.Replicated}}'`)
          const mode = JSON.parse(inspectOut || '{}')
          
          // Get container stats dari semua replica
          const { stdout: taskOut } = await execAsync(`docker service ps ${serviceName} --format "{{.ID}}" --filter "desired-state=running"`)
          const taskIds = taskOut.trim().split('\n').filter(Boolean)
          
          let totalCpu = 0
          let totalMemory = 0
          let totalMemUsage = 0
          let totalMemLimit = 0
          
          for (const taskId of taskIds) {
            try {
              const { stdout: statsOut } = await execAsync(`docker stats ${taskId} --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}|{{.NetIO}}"`)
              const [cpuStr, memStr, memUsage, netIO] = statsOut.trim().split('|')
              totalCpu += parseFloat(cpuStr.replace('%', '')) || 0
              totalMemory += parseFloat(memStr.replace('%', '')) || 0
              
              const [usage, limit] = memUsage.split('/').map((s: string) => s.trim())
              totalMemUsage += parseFloat(usage.replace('MiB', '').replace('GiB', '*1024')) || 0
              totalMemLimit += parseFloat(limit.replace('MiB', '').replace('GiB', '*1024')) || 0
            } catch {}
          }
          
          const replicaCount = taskIds.length
          
          stats.push({
            name: project.name,
            cpu: totalCpu,
            memory: totalMemory / replicaCount,
            memoryUsage: totalMemUsage,
            memoryLimit: totalMemLimit,
            networkRx: 0,
            networkTx: 0,
            status: 'running',
            replicas: mode.Replicated?.Replicas || replicaCount
          })
          continue
        }
      } catch {}
      
      // Fallback: cek container Docker biasa
      try {
        const container = docker.getContainer(`app-${project.id}`)
        const inspect = await container.inspect()
        
        if (inspect.State.Running) {
          const stats = await container.stats({ stream: false })
          
          const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
          const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
          const cpuPercent = (cpuDelta / systemDelta) * 100
          
          const memUsage = stats.memory_stats.usage
          const memLimit = stats.memory_stats.limit
          const memPercent = (memUsage / memLimit) * 100
          
          stats.push({
            name: project.name,
            cpu: cpuPercent,
            memory: memPercent,
            memoryUsage: memUsage / 1024 / 1024,
            memoryLimit: memLimit / 1024 / 1024,
            networkRx: 0,
            networkTx: 0,
            status: 'running',
            replicas: 1
          })
        }
      } catch {}
    }
    
    return { stats, timestamp: Date.now() }
  })
  
  // Get detailed metrics for single project
  .get('/project/:id', async ({ params, headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    
    const project = await prisma.project.findUnique({
      where: { id: params.id }
    })
    
    if (!project) {
      set.status = 404
      return { error: 'Project not found' }
    }
    
    try {
      const serviceName = `app-${project.id}`
      
      // Get all replicas info
      const { stdout: taskOut } = await execAsync(`docker service ps ${serviceName} --format "{{.ID}}|{{.CurrentState}}|{{.Node}}" --filter "desired-state=running" 2>/dev/null`)
      const tasks = taskOut.trim().split('\n').filter(Boolean).map(line => {
        const [id, state, node] = line.split('|')
        return { id, state, node }
      })
      
      // Get HPA status
      let hpa: any = null
      try {
        const { stdout: hpaOut } = await execAsync(`kubectl get hpa -n smartdeploy -o json 2>/dev/null`)
        const hpaList = JSON.parse(hpaOut)
        hpa = hpaList.items?.find((h: any) => h.metadata.name === `hpa-${project.id}`)
      } catch {}
      
      // Get service metrics
      const replicaStats = []
      for (const task of tasks) {
        try {
          const { stdout: statsOut } = await execAsync(`docker stats ${task.id} --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}"`)
          const [cpu, mem, memUsage] = statsOut.trim().split('|')
          replicaStats.push({
            id: task.id.substring(0, 8),
            cpu: parseFloat(cpu.replace('%', '')),
            memory: parseFloat(mem.replace('%', '')),
            memUsage,
            node: task.node,
            state: task.state
          })
        } catch {}
      }
      
      return {
        project: project.name,
        subdomain: project.subdomain,
        replicas: tasks.length,
        replicaStats,
        hpa: hpa ? {
          currentCPU: hpa.status?.currentCPUUtilizationPercentage,
          currentReplicas: hpa.status?.currentReplicas,
          desiredReplicas: hpa.status?.desiredReplicas,
          minReplicas: hpa.spec?.minReplicas,
          maxReplicas: hpa.spec?.maxReplicas
        } : null,
        timestamp: Date.now()
      }
    } catch (error: any) {
      console.error('Metrics error:', error)
      
      // Fallback ke container biasa
      try {
        const container = docker.getContainer(`app-${project.id}`)
        const stats = await container.stats({ stream: false })
        const inspect = await container.inspect()
        
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
        const cpuPercent = (cpuDelta / systemDelta) * 100
        
        return {
          project: project.name,
          subdomain: project.subdomain,
          replicas: 1,
          replicaStats: [{
            id: inspect.Id.substring(0, 8),
            cpu: cpuPercent,
            memory: (stats.memory_stats.usage / stats.memory_stats.limit) * 100,
            memUsage: `${Math.round(stats.memory_stats.usage / 1024 / 1024)}MiB / ${Math.round(stats.memory_stats.limit / 1024 / 1024)}MiB`,
            state: inspect.State.Status
          }],
          timestamp: Date.now()
        }
      } catch {
        return {
          project: project.name,
          replicas: 0,
          error: 'Service not found'
        }
      }
    }
  })
  
  // Get replica count (simple)
  .get('/:id/replicas', async ({ params }) => {
    try {
      const serviceName = `app-${params.id}`
      const { stdout } = await execAsync(`docker service ps ${serviceName} --format "{{.ID}}" --filter "desired-state=running" 2>/dev/null | wc -l`)
      return { replicas: parseInt(stdout.trim()) || 1 }
    } catch {
      return { replicas: 1 }
    }
  })