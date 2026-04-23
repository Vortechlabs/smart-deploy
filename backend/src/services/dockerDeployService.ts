import Docker from 'dockerode'
import { prisma } from '../lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)
const docker = new Docker()

const NGINX_SITES_AVAILABLE = '/etc/nginx/sites-available'
const NGINX_SITES_ENABLED = '/etc/nginx/sites-enabled'

export async function deployToDocker(
  projectId: string,
  imageName: string,
  port: number = 80,
  subdomain: string
) {
  const containerName = `app-${projectId}`
  const hostPort = 30000 + Math.floor(Math.random() * 1000)
  
  console.log(`🐳 Deploying: ${containerName} on port ${hostPort}`)
  
  try {
    // Hapus container lama jika ada
    try {
      const oldContainer = docker.getContainer(containerName)
      await oldContainer.stop()
      await oldContainer.remove()
      console.log(`✅ Removed old container`)
    } catch (e: any) {
      if (e.statusCode !== 404) console.log(`⚠️ Cleanup: ${e.message}`)
    }
    
    // Buat container baru
    const container = await docker.createContainer({
      name: containerName,
      Image: imageName,
      ExposedPorts: { [`${port}/tcp`]: {} },
      HostConfig: {
        PortBindings: {
          [`${port}/tcp`]: [{ HostPort: `${hostPort}` }]
        },
        RestartPolicy: { Name: 'unless-stopped' }
      }
    })
    
    await container.start()
    console.log(`✅ Container started on port ${hostPort}`)
    
    // Update database
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'running', port: hostPort }
    })
    
    // BUAT NGINX CONFIG OTOMATIS
    await createNginxConfig(subdomain, hostPort)
    
    console.log(`🎉 Deployed! http://${subdomain}.localhost`)
    
    return { containerId: container.id, port: hostPort }
  } catch (error) {
    console.error('❌ Deploy error:', error)
    throw error
  }
}

async function createNginxConfig(subdomain: string, port: number) {
  const configFile = `${NGINX_SITES_AVAILABLE}/${subdomain}`
  const configContent = `server {
    listen 80;
    server_name ${subdomain}.localhost;
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
`
  await fs.writeFile(configFile, configContent)
  console.log(`✅ Config created: ${configFile}`)
  
  // Enable site
  const enabledLink = `${NGINX_SITES_ENABLED}/${subdomain}`
  try { await fs.unlink(enabledLink) } catch {}
  await fs.symlink(configFile, enabledLink)
  console.log(`✅ Config enabled: ${enabledLink}`)
  
  // Reload Nginx
  try {
    await execAsync('sudo nginx -t')
    await execAsync('sudo systemctl reload nginx')
    console.log(`✅ Nginx reloaded`)
  } catch (error: any) {
    console.error(`⚠️ Nginx error: ${error.message}`)
  }
}

export async function deleteDeployment(projectId: string, subdomain?: string) {
  const containerName = `app-${projectId}`
  
  // 1. HAPUS CONTAINER
  try {
    const container = docker.getContainer(containerName)
    await container.stop()
    await container.remove()
    console.log(`✅ Container ${containerName} deleted`)
  } catch (e: any) {
    if (e.statusCode !== 404) console.log(`⚠️ Container error: ${e.message}`)
  }
  
  // 2. HAPUS NGINX CONFIG (OTOMATIS!)
  if (subdomain) {
    try {
      // Hapus symlink
      await fs.unlink(`${NGINX_SITES_ENABLED}/${subdomain}`).catch(() => {})
      // Hapus file config
      await fs.unlink(`${NGINX_SITES_AVAILABLE}/${subdomain}`).catch(() => {})
      console.log(`✅ Nginx config removed for ${subdomain}.localhost`)
      
      // Reload Nginx
      await execAsync('sudo systemctl reload nginx')
      console.log(`✅ Nginx reloaded`)
    } catch (error) {
      console.log(`⚠️ Config removal error: ${error}`)
    }
  }
}
