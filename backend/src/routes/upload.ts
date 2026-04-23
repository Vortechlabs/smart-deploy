import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'
import fs from 'fs/promises'
import path from 'path'
import AdmZip from 'adm-zip'

export const uploadRoutes = new Elysia({ prefix: '/projects' })
  .post('/upload-zip', async ({ body, headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    
    try {
      // Elysia + Bun built-in multipart parsing
      const formData = body as any
      
      const file = formData.file
      const projectName = formData.projectName
      const subdomain = formData.subdomain
      const port = parseInt(formData.port) || 80
      
      if (!file || !projectName || !subdomain) {
        set.status = 400
        return { 
          error: 'Missing required fields',
          received: { 
            hasFile: !!file, 
            projectName, 
            subdomain 
          }
        }
      }
      
      console.log(`📦 Upload ZIP: ${projectName} (${subdomain})`)
      
      // Check if subdomain exists
      const existing = await prisma.project.findUnique({
        where: { subdomain }
      })
      
      if (existing) {
        set.status = 400
        return { error: 'Subdomain already taken' }
      }
      
      const timestamp = Date.now()
      const zipPath = path.join('/tmp', `${timestamp}-${projectName}.zip`)
      const extractPath = path.join('/tmp', `extract-${timestamp}-${projectName}`)
      
      // Handle file - Bun File object
      let buffer: Buffer
      
      if (typeof file === 'object' && file.arrayBuffer) {
        // Browser File/Blob
        buffer = Buffer.from(await file.arrayBuffer())
      } else if (file instanceof Blob) {
        // Blob
        buffer = Buffer.from(await file.arrayBuffer())
      } else if (file?.buffer) {
        // Already a buffer
        buffer = file.buffer
      } else {
        set.status = 400
        return { error: 'Invalid file format' }
      }
      
      await fs.writeFile(zipPath, buffer)
      console.log(`✅ ZIP saved: ${buffer.length} bytes`)
      
      // Extract zip
      const zip = new AdmZip(zipPath)
      zip.extractAllTo(extractPath, true)
      console.log(`✅ Extracted to: ${extractPath}`)
      
      // Cleanup zip
      await fs.unlink(zipPath).catch(() => {})
      
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
      
      console.log(`✅ Project created: ${project.id}`)
      

// Trigger deployment dengan localPath
const { triggerDeploy } = await import('../controllers/buildController')
const deploymentId = await triggerDeploy(project.id, user.id, token, extractPath)  // ← extractPath sebagai localPath

return { 
  success: true,
  id: project.id, 
  deploymentId 
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
      port: t.Optional(t.String())
    })
  })