// backend/src/routes/databases.ts
import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { provisionDatabase } from '../services/databaseService'

// 🔥 TAMBAHKAN INI
async function authenticateUser(authorization?: string) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { error: 'Unauthorized' as const }
  }
  const token = authorization.substring(7).trim()
  if (!token) return { error: 'Unauthorized' as const }
  
  const user = await prisma.user.findFirst({
    where: { githubToken: token }
  })
  if (!user) return { error: 'User not found' as const }
  return { user }
}

function generatePassword(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export const databaseRoutes = new Elysia({ prefix: '/databases' })
  
  // Get database info
  .get('/:projectId', async ({ params, headers, set }) => {
    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }
    
    const db = await prisma.database.findUnique({ 
      where: { projectId: params.projectId } 
    })
    
    if (!db) {
      return { provisioned: false }
    }
    
    return {
      provisioned: true,
      type: db.type,
      host: db.host,
      port: db.port,
      name: db.name,
      user: db.user,
      password: db.password,
      status: db.status
    }
  })
  
  // Provision database
  .post('/:projectId/provision', async ({ params, body, headers, set }) => {
    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }
    
    const project = await prisma.project.findFirst({
      where: { id: params.projectId, userId: auth.user.id }
    })
    
    if (!project) {
      set.status = 404
      return { error: 'Project not found' }
    }
    
    try {
      const credentials = await provisionDatabase(
        params.projectId, 
        project.name, 
        (body as any).dbType || 'mysql'
      )
      return { success: true, credentials }
    } catch (e: any) {
      set.status = 500
      return { error: e.message }
    }
  }, {
    body: t.Object({
      dbType: t.Optional(t.String())
    })
  })
  
  // Reset password
  .post('/:projectId/reset-password', async ({ params, headers, set }) => {
    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }
    
    const newPassword = generatePassword(16)
    const db = await prisma.database.update({
      where: { projectId: params.projectId },
      data: { password: newPassword }
    })
    
    return { success: true, password: newPassword }
  })