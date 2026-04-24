import 'dotenv/config'  // ← BARIS INI HARUS PERTAMA! SEBELUM APAPUN!

import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { authRoutes } from './routes/auth'
import { projectsRoutes } from './routes/projects'
import { deploymentsRoutes } from './routes/deployments'
import { logStream } from './websocket/logStream'
import { metricsRoutes } from './routes/metrics'
import { metricsStream } from './websocket/metricsStream'
import { stressRoutes } from './routes/stress'
import { settingsRoutes } from './routes/settings'
import { startPolling } from './services/pollingService'

// Debug: cek environment variables
console.log("🔧 Environment check:")
console.log("  GITHUB_CLIENT_ID exists:", !!process.env.GITHUB_CLIENT_ID)
console.log("  GITHUB_CLIENT_SECRET exists:", !!process.env.GITHUB_CLIENT_SECRET)
console.log("  DATABASE_URL exists:", !!process.env.DATABASE_URL)

const app = new Elysia()
   .use(cors({
    origin: [
      'http://41.216.191.42:3001', 
      'http://41.216.191.42:3000',
      'http://41.216.191.42', // Tanpa port buat jaga-jaga
      'http://localhost:3001',
      'http://localhost:3000'
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
  }))
  .use(swagger({
    path: '/swagger',
    documentation: {
      info: {
        title: 'Personal PaaS API',
        version: '1.0.0',
        description: 'API for Personal Platform as a Service'
      }
    }
  }))
  .use(authRoutes)
  .use(projectsRoutes)
  .use(deploymentsRoutes)
  .use(logStream)
  .use(metricsRoutes)
  .use(metricsStream)
  .use(stressRoutes) 
  .use(settingsRoutes)
  .use(monitoringRoutes)
  .get('/', () => ({ message: 'Personal PaaS API', status: 'running' }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(3000)
  startPolling().catch(console.error)

app.on('start', () => {
  console.log('📡 Server started, WebSocket endpoints:')
  console.log('   - ws:/${process.env.DOMAIN_SUFFIX || ".localhost"}:3000/ws/deploy/:id')
  console.log('   - ws:/${process.env.DOMAIN_SUFFIX || ".localhost"}:3000/ws/metrics/:projectId')
})

console.log(`🚀 Personal PaaS Backend running at http:/${process.env.DOMAIN_SUFFIX || ".localhost"}:3000`)
console.log(`📚 Swagger UI at http:/${process.env.DOMAIN_SUFFIX || ".localhost"}:3000/swagger`)
console.log(`🔌 WebSocket endpoint at ws:/${process.env.DOMAIN_SUFFIX || ".localhost"}:3000/ws/deploy/:id`)
// Upload routes
import { uploadRoutes } from './routes/upload'
app.use(uploadRoutes)

// Webhook routes
import { webhookRoutes } from './routes/webhook'
import { monitoringRoutes } from './routes/monitoring'
app.use(webhookRoutes)
