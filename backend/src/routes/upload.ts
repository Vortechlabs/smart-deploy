// backend/src/routes/upload.ts
import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'

export const uploadRoutes = new Elysia({ prefix: '/projects' })
  .post('/upload-zip', async ({ body, headers, set }) => {
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
    
    try {
      const formData = body as any
      const file = formData.file
      const projectName = formData.projectName
      const subdomain = formData.subdomain
      const port = parseInt(formData.port) || 80
      const sqlFile = formData.sqlFile || null // NEW: SQL file
      const envVars = formData.envVars ? JSON.parse(formData.envVars) : {} // NEW: Env vars
      
      // Check subdomain
      const existing = await prisma.project.findUnique({ where: { subdomain } })
      if (existing) {
        set.status = 400
        return { error: 'Subdomain already taken' }
      }
      
      const timestamp = Date.now()
      const extractPath = path.join('/tmp', `extract-${timestamp}-${projectName}`)
      
      // Handle main ZIP file
      let buffer: Buffer
      if (file.arrayBuffer) {
        buffer = Buffer.from(await file.arrayBuffer())
      } else if (file.buffer) {
        buffer = file.buffer
      } else {
        set.status = 400
        return { error: 'Invalid file format' }
      }
      
      const zipPath = path.join('/tmp', `${timestamp}-${projectName}.zip`)
      await fs.writeFile(zipPath, buffer)
      
      const zip = new AdmZip(zipPath)
      zip.extractAllTo(extractPath, true)
      await fs.unlink(zipPath)
      
      // Handle SQL file if provided
      let sqlFilePath: string | null = null
      if (sqlFile) {
        const sqlBuffer = sqlFile.buffer || Buffer.from(await sqlFile.arrayBuffer())
        sqlFilePath = path.join(extractPath, 'init.sql')
        await fs.writeFile(sqlFilePath, sqlBuffer)
        console.log(`✅ SQL file saved to ${sqlFilePath}`)
      }
      
      // Handle .env file
      if (Object.keys(envVars).length > 0) {
        let envContent = ''
        for (const [key, value] of Object.entries(envVars)) {
          envContent += `${key}=${value}\n`
        }
        await fs.writeFile(path.join(extractPath, '.env'), envContent)
        console.log(`✅ .env file created`)
      }
      
      // Create project
      const project = await prisma.project.create({
        data: {
          name: projectName,
          repoUrl: `file://${extractPath}`,
          branch: 'local',
          subdomain,
          port,
          userId: user.id,
          status: 'pending'
        }
      })
      
      // Trigger deployment
      const { triggerDeploy } = await import('../controllers/buildController')
      const deploymentId = await triggerDeploy(
        project.id, 
        user.id, 
        token, 
        extractPath
      )
      
      return {
        success: true,
        id: project.id,
        deploymentId,
        url: `http://${subdomain}.${process.env.NODE_ENV === 'production' ? 'qode.my.id' : 'localhost'}`
      }
      
    } catch (error: any) {
      console.error('❌ Upload error:', error)
      set.status = 500
      return { error: error.message || 'Upload failed' }
    }
  }, {
    body: t.Object({
      file: t.Any(),
      projectName: t.String(),
      subdomain: t.String(),
      port: t.Optional(t.String()),
      sqlFile: t.Optional(t.Any()),
      envVars: t.Optional(t.String())
    })
  })