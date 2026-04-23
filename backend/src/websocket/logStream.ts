import { Elysia } from 'elysia'
import { prisma } from '../lib/prisma'

export const logStream = new Elysia()
  .ws('/ws/deploy/:deploymentId', {
    async open(ws) {
      const { deploymentId } = ws.data.params
      console.log(`🔌 WebSocket connected for deployment ${deploymentId}`)
      
      // Send existing logs
      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentId },
        include: { project: true }
      })
      
      if (deployment?.logs) {
        ws.send(JSON.stringify({
          type: 'history',
          logs: deployment.logs,
          status: deployment.status
        }))
      }
      
      // Poll for new logs
      let lastLogCount = deployment?.logs?.length || 0
      
      const interval = setInterval(async () => {
        const updated = await prisma.deployment.findUnique({
          where: { id: deploymentId }
        })
        
        if (updated && updated.logs && updated.logs.length > lastLogCount) {
          const newLogs = updated.logs.substring(lastLogCount)
          ws.send(JSON.stringify({
            type: 'log',
            logs: newLogs,
            status: updated.status
          }))
          lastLogCount = updated.logs.length
        }
        
        if (updated && (updated.status === 'running' || updated.status === 'failed')) {
          ws.send(JSON.stringify({
            type: 'done',
            status: updated.status
          }))
        }
      }, 500)
      
      ws.on('close', () => {
        console.log(`🔌 WebSocket closed for deployment ${deploymentId}`)
        clearInterval(interval)
      })
    }
  })