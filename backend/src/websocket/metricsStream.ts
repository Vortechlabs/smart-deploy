import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const metricsStream = new Elysia()
  .ws('/ws/metrics/:projectId', {
    body: t.Object({}),
    
    async open(ws) {
      const projectId = ws.data.params.projectId
      
      console.log(`📊 Metrics client connected for project ${projectId}`)
      
      // Send initial data immediately
      await sendMetrics(ws, projectId)
      
      // Start periodic updates
      const interval = setInterval(async () => {
        if (ws.readyState === 1) { // OPEN
          await sendMetrics(ws, projectId)
        } else {
          clearInterval(interval)
        }
      }, 2000)
      
      // Store interval for cleanup
      ws.data.interval = interval
    },
    
    async close(ws) {
      const projectId = ws.data.params.projectId
      
      if (ws.data.interval) {
        clearInterval(ws.data.interval)
      }
      
      console.log(`📊 Metrics client disconnected from project ${projectId}`)
    }
  })

async function sendMetrics(ws: any, projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })
    
    if (!project) {
      ws.send(JSON.stringify({ 
        type: 'status',
        status: 'not_found',
        replicas: 0,
        message: 'Project not found'
      }))
      return
    }
    
    if (project.status !== 'running') {
      ws.send(JSON.stringify({ 
        type: 'status',
        status: project.status,
        replicas: 0,
        message: `Project is ${project.status}`
      }))
      return
    }
    
    const serviceName = `app-${projectId}`
    
    try {
      // Check if service exists
      const { stdout: serviceCheck } = await execAsync(`docker service ls --format "{{.Name}}" --filter "name=${serviceName}" 2>/dev/null`)
      
      if (!serviceCheck.trim()) {
        // Try single container instead
        try {
          const { stdout: containerCheck } = await execAsync(`docker ps --format "{{.Names}}" --filter "name=${serviceName}" 2>/dev/null`)
          
          if (containerCheck.trim()) {
            // Single container mode
const containerName = `${serviceName}.${taskLine.split('.')[1] || '1'}.${taskId}`
const { stdout: statsOut } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}" 2>/dev/null`)

            if (statsOut) {
              const [cpuStr, memStr, memUsage] = statsOut.trim().split('|')
              const cpu = parseFloat(cpuStr.replace('%', '')) || 0
              const mem = parseFloat(memStr.replace('%', '')) || 0
              
              ws.send(JSON.stringify({
                type: 'metrics',
                timestamp: Date.now(),
                replicas: 1,
                desiredReplicas: 1,
                avgCpu: cpu,
                avgMemory: mem,
                stats: [{
                  id: projectId.substring(0, 8),
                  cpu: cpu,
                  memory: mem,
                  memUsage: memUsage || 'N/A',
                  state: '🟢 Running'
                }],
                subdomain: project.subdomain
              }))
              return
            }
          }
        } catch (containerError) {
          // Container not found
        }
        
        ws.send(JSON.stringify({
          type: 'status',
          status: 'stopped',
          replicas: 0,
          message: 'Service not running'
        }))
        return
      }
      
      // Service exists - get details
      const { stdout: inspectOut } = await execAsync(`docker service inspect ${serviceName} --format '{{json .Spec.Mode.Replicated}}' 2>/dev/null`)
      const mode = inspectOut ? JSON.parse(inspectOut) : { Replicas: 1 }
      
      // Get all running tasks
      const { stdout: taskOut } = await execAsync(`docker service ps ${serviceName} --format "{{.ID}}|{{.CurrentState}}" --filter "desired-state=running" 2>/dev/null`)
      const tasks = taskOut.trim().split('\n').filter(Boolean)
      
      const stats = []
      let totalCpu = 0
      let totalMemory = 0
      
for (const taskLine of tasks) {
  const parts = taskLine.split('|')
  const taskId = parts[0]
  const state = parts.slice(1).join('|')
  
  // 🔥 CARI CONTAINER NAME YANG BENAR
  try {
    // Container name format: app-xxx.1.taskid
    const { stdout: containerOut } = await execAsync(`docker ps --format "{{.Names}}" --filter "name=${taskId}" 2>/dev/null | head -1`)
    const containerName = containerOut.trim()
    
    if (!containerName) {
      // Skip jika container tidak ditemukan
      continue
    }
    
    const { stdout: statsOut } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}" 2>/dev/null`)
    
    if (statsOut && statsOut.trim()) {
      const statParts = statsOut.trim().split('|')
      const cpuStr = statParts[0] || '0%'
      const memStr = statParts[1] || '0%'
      const memUsage = statParts[2] || 'N/A'
      
      const cpu = parseFloat(cpuStr.replace('%', '')) || 0
      const mem = parseFloat(memStr.replace('%', '')) || 0
      
      totalCpu += cpu
      totalMemory += mem
      
      let stateEmoji = '🟢'
      if (state.includes('Starting') || state.includes('Preparing')) stateEmoji = '🟡'
      if (state.includes('Failed') || state.includes('Shutdown')) stateEmoji = '🔴'
      
      stats.push({
        id: containerName, // 🔥 PAKAI NAMA LENGKAP, jangan dipotong!
        cpu,
        memory: mem,
        memUsage,
        state: `${stateEmoji} ${state.substring(0, 15)}`
      })
    }
  } catch (taskError) {
    // Skip
  }
}
      
      const replicaCount = tasks.length
      
      ws.send(JSON.stringify({
        type: 'metrics',
        timestamp: Date.now(),
        replicas: replicaCount,
        desiredReplicas: mode.Replicated?.Replicas || replicaCount,
        avgCpu: replicaCount > 0 ? totalCpu / replicaCount : 0,
        avgMemory: replicaCount > 0 ? totalMemory / replicaCount : 0,
        stats: stats.length > 0 ? stats : [{
          id: 'main',
          cpu: 0,
          memory: 0,
          memUsage: 'N/A',
          state: '🟡 Starting'
        }],
        subdomain: project.subdomain
      }))
      
    } catch (error: any) {
      console.error(`Metrics error for ${projectId}:`, error.message)
      
      // Fallback response
      ws.send(JSON.stringify({
        type: 'status',
        status: project.status,
        replicas: 0,
        message: 'Unable to fetch metrics'
      }))
    }
    
  } catch (error: any) {
    console.error('Send metrics error:', error.message)
    
    // Ensure we always send valid JSON
    try {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal error'
      }))
    } catch {}
  }
}