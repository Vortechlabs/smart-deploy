import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  
  // Get user settings
  .get('/', async ({ headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    
    const token = authHeader.substring(7)
    const user = await prisma.user.findFirst({
      where: { githubToken: token },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        settings: true
      }
    })
    
    if (!user) {
      set.status = 401
      return { error: 'User not found' }
    }
    
    // Default settings jika belum ada
    const defaultSettings = {
      theme: 'system',
      notifications: true,
      autoDeploy: true
    }
    
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      },
      settings: user.settings ? JSON.parse(user.settings) : defaultSettings
    }
  })
  
  // Update user settings
  .put('/', async ({ body, headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    
    const token = authHeader.substring(7)
    const user = await prisma.user.findFirst({
      where: { githubToken: token }
    })
    
    if (!user) {
      set.status = 401
      return { error: 'User not found' }
    }
    
    const { username, email, theme, notifications, autoDeploy } = body as any
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: username || undefined,
        email: email || undefined,
        settings: JSON.stringify({ theme, notifications, autoDeploy })
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        settings: true
      }
    })
    
    return {
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl
      },
      settings: JSON.parse(updatedUser.settings || '{}')
    }
  }, {
    body: t.Object({
      username: t.Optional(t.String()),
      email: t.Optional(t.String()),
      theme: t.Optional(t.String()),
      notifications: t.Optional(t.Boolean()),
      autoDeploy: t.Optional(t.Boolean())
    })
  })
  
  // Get webhook URL
  .get('/webhook-url', ({ headers }) => {
    // Bisa dari env atau generate
    const baseUrl = process.env.PUBLIC_URL || 'http://41.216.191.42:3000'
    return { webhookUrl: `${baseUrl}/webhook/github` }
  })