import { Prisma } from '@prisma/client'
import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import { deleteDeployment } from '../services/dockerDeployService'

const projectIdParamsSchema = t.Object({
  id: t.String({ minLength: 1 })
})

const createProjectBodySchema = t.Object({
  name: t.String({ minLength: 1 }),
  repoUrl: t.String({ format: 'uri', minLength: 1 }),
  branch: t.Optional(t.String({ minLength: 1 })),
  subdomain: t.String({
    minLength: 3,
    maxLength: 63,
    pattern: '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$'
  }),
  port: t.Optional(t.Integer({ minimum: 1, maximum: 65535 }))
})

async function authenticateUser(authorization?: string) {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return { error: 'Unauthorized' as const }
  }

  const token = authorization.substring(7).trim()
  if (!token) {
    return { error: 'Unauthorized' as const }
  }

  const user = await prisma.user.findFirst({
    where: { githubToken: token }
  })

  if (!user) {
    return { error: 'User not found' as const }
  }

  return { user }
}

export const projectsRoutes = new Elysia({ prefix: '/projects' })
  // Get all projects
  .get('/', async ({ headers, set }) => {
    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }

    const projects = await prisma.project.findMany({
      where: { userId: auth.user.id },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return projects
  })
  
  // Create new project
  .post('/', async ({ body, headers, set }) => {
    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }

    const { name, repoUrl, branch, subdomain, port } = body

    try {
const project = await prisma.project.create({
  data: {
    name: name.trim(),
    repoUrl,
    branch: branch?.trim() || 'main',
    subdomain: subdomain.trim().toLowerCase(),
    port: port ?? 3000,
    userId: auth.user.id,
    status: 'pending',
    autoDeploy: true  // ← DEFAULT ON
  }
})
      return project
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        set.status = 400
        return { error: 'Subdomain already taken' }
      }

      console.error('❌ Create project error:', error)
      set.status = 500
      return { error: 'Failed to create project' }
    }
  }, {
    body: createProjectBodySchema
  })


.get('/:id/status', async ({ params, headers, set }) => {
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
  
  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: user.id },
    select: {
      status: true,
      deployments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, status: true, commitHash: true, createdAt: true }
      }
    }
  })
  
  if (!project) {
    set.status = 404
    return { error: 'Project not found' }
  }
  
  return project
})


.patch('/:id/auto-deploy', async ({ params, body, headers, set }) => {
  const auth = await authenticateUser(headers.authorization)
  if ('error' in auth) {
    set.status = 401
    return { error: auth.error }
  }
  
  const { autoDeploy } = body as { autoDeploy: boolean }
  
  const project = await prisma.project.update({
    where: { id: params.id, userId: auth.user.id },
    data: { autoDeploy }
  })
  
  return { success: true, autoDeploy: project.autoDeploy }
})
  
  
  // Get specific project
  .get('/:id', async ({ params, headers, set }) => {
    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id
      },
      include: {
        deployments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!project) {
      set.status = 404
      return { error: 'Project not found' }
    }
    
    return project
  }, {
    params: projectIdParamsSchema
  })

// Check subdomain availability - PUBLIC (NO AUTH REQUIRED)
.get('/check-subdomain', async ({ query, set }) => {
  const subdomain = query.subdomain as string
  
  if (!subdomain || subdomain.length < 3) {
    return { available: false, error: 'Subdomain too short' }
  }
  
  const subdomainRegex = /^[a-z0-9-]+$/
  if (!subdomainRegex.test(subdomain)) {
    return { available: false, error: 'Invalid format' }
  }
  
  const existing = await prisma.project.findUnique({
    where: { subdomain }
  })
  
  return { available: !existing }
})
  
  // DELETE project - OTOMATIS HAPUS CONFIG NGINX!
  .delete('/:id', async ({ params, headers, set }) => {
    console.log(`🗑️ Deleting project: ${params.id}`)

    const auth = await authenticateUser(headers.authorization)
    if ('error' in auth) {
      set.status = 401
      return { error: auth.error }
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: auth.user.id
      }
    })
    
    if (!project) {
      set.status = 404
      return { error: 'Project not found' }
    }
    
    try {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'deleting' }
      })

      // 🔥 HAPUS DARI DOCKER DAN NGINX (OTOMATIS!)
      await deleteDeployment(params.id, project.subdomain)

      await prisma.$transaction(async (tx) => {
        await tx.buildLog.deleteMany({
          where: {
            deployment: {
              projectId: params.id
            }
          }
        })

        await tx.project.delete({
          where: { id: params.id }
        })
      })
      
      console.log(`✅ Project ${params.id} (${project.subdomain}) deleted COMPLETELY`)
      return { success: true, message: 'Project deleted successfully' }
      
    } catch (error: any) {
      console.error('❌ Delete error:', error)

      try {
        await prisma.project.update({
          where: { id: params.id },
          data: { status: 'failed' }
        })
      } catch (statusError) {
        console.error('⚠️ Failed to restore project status after delete error:', statusError)
      }

      set.status = 500
      return { error: 'Failed to delete project' }
    }
  }, {
    params: projectIdParamsSchema
  })
