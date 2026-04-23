import Docker from 'dockerode'
import { prisma } from '../lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'

const execAsync = promisify(exec)
const docker = new Docker()

const SWARM_NETWORK = 'smartdeploy-net'

const REGISTRY = 'localhost:5000'

export async function deployToSwarm(
  projectId: string,
  imageName: string,
  port: number = 80,
  subdomain: string
) {
  const serviceName = `app-${projectId}`
  const hostPort = 30000 + Math.floor(Math.random() * 1000)
  
  console.log(`🐳 Deploying to Docker Swarm: ${serviceName}`)
  console.log(`   Image: ${imageName}`)
  console.log(`   Container port: ${port} -> Host port: ${hostPort}`)
  
  try {
    // Hapus service lama
    try {
      await execAsync(`docker service rm ${serviceName}`)
      console.log(`✅ Removed old service`)
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (e: any) {
      if (!e.message.includes('not found')) console.log(`⚠️ Cleanup: ${e.message}`)
    }
    
    // Pastikan network exists
    try {
      await execAsync(`docker network inspect ${SWARM_NETWORK}`)
    } catch {
      await execAsync(`docker network create --driver overlay ${SWARM_NETWORK}`)
      console.log(`✅ Created network: ${SWARM_NETWORK}`)
    }
    
    // Pull image dari registry

console.log(`📥 Pulling image: ${imageName}`)
try {
  await execAsync(`docker pull ${imageName}`)
  console.log(`✅ Image pulled`)
} catch (pullError: any) {
  console.log(`⚠️ Pull failed, using local: ${pullError.message}`)
  // 🔥 JANGAN THROW ERROR - langsung lanjut
}

// Create service (PASTIKAN imageName benar)
const createCommand = `docker service create \
  --name ${serviceName} \
  --network ${SWARM_NETWORK} \
  --publish published=${hostPort},target=${port} \
  --replicas 1 \
  --with-registry-auth \
  --label "smartdeploy.project=${projectId}" \
  --label "smartdeploy.subdomain=${subdomain}" \
  --limit-cpu 0.5 \
  --limit-memory 512M \
  --reserve-cpu 0.1 \
  --reserve-memory 128M \
  --restart-condition any \
  ${imageName}`

console.log(`📦 Creating service...`)
const { stdout } = await execAsync(createCommand)
console.log(`✅ Service created: ${stdout.trim()}`)
    
    
    // Tunggu service ready
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Update database
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'running', port: hostPort }
    })
    
    // Update Nginx config
    await updateNginxConfig(subdomain, hostPort)
    
    console.log(`🎉 Deployed! http://${subdomain}.localhost`)
    
    return { serviceName, port: hostPort }
    
  } catch (error: any) {
    console.error('❌ Swarm deploy error:', error)
    throw error
  }
}

async function updateNginxConfig(subdomain: string, port: number) {
  const configFile = `/etc/nginx/sites-available/${subdomain}`
  
  // Simple config yang PASTI berfungsi
  const configContent = `server {
    listen 80;
    server_name ${subdomain}.localhost;
    
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
`
  
  try {
    await fs.writeFile(configFile, configContent)
    console.log(`✅ Nginx config created: ${configFile}`)
    
    // Enable site
    await execAsync(`sudo ln -sf ${configFile} /etc/nginx/sites-enabled/`)
    
    // Test dan reload Nginx
    await execAsync('sudo nginx -t')
    await execAsync('sudo systemctl reload nginx')
    console.log(`✅ Nginx reloaded - ${subdomain}.localhost → port ${port}`)
    
  } catch (error: any) {
    console.error(`⚠️ Nginx error: ${error.message}`)
    throw error
  }
}

export async function scaleService(projectId: string, replicas: number) {
  const serviceName = `app-${projectId}`
  
  try {
    await execAsync(`docker service scale ${serviceName}=${replicas}`)
    console.log(`📊 Scaled ${serviceName} to ${replicas} replicas`)
    return true
  } catch (error: any) {
    console.error(`❌ Scale error: ${error.message}`)
    return false
  }
}

export async function getServiceReplicas(projectId: string): Promise<number> {
  const serviceName = `app-${projectId}`
  
  try {
    const { stdout } = await execAsync(`docker service ls --format "{{.Replicas}}" --filter "name=${serviceName}"`)
    const match = stdout.match(/(\d+)\/(\d+)/)
    return match ? parseInt(match[1]) : 0
  } catch {
    return 0
  }
}

export async function deleteSwarmDeployment(projectId: string, subdomain?: string) {
  const serviceName = `app-${projectId}`
  
  try {
    await execAsync(`docker service rm ${serviceName}`)
    console.log(`✅ Service ${serviceName} deleted`)
  } catch (e: any) {
    console.log(`⚠️ Delete error: ${e.message}`)
  }
  
  if (subdomain) {
    try {
      await execAsync(`sudo rm -f /etc/nginx/sites-available/${subdomain}`)
      await execAsync(`sudo rm -f /etc/nginx/sites-enabled/${subdomain}`)
      await execAsync('sudo systemctl reload nginx')
      console.log(`✅ Nginx config removed for ${subdomain}`)
    } catch (error) {
      console.log(`⚠️ Config removal error: ${error}`)
    }
  }
}