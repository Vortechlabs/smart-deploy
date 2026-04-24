import * as k8s from '@kubernetes/client-node'
import { prisma } from '../lib/prisma'
import Docker from 'dockerode'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const docker = new Docker()

let kc: k8s.KubeConfig | null = null
let useK8s = false

// Coba load kubeconfig
try {
  kc = new k8s.KubeConfig()
  kc.loadFromDefault()
  
  // Test koneksi
  const context = kc.getCurrentContext()
  console.log(`✅ Kubernetes context: ${context}`)
  useK8s = true
} catch (error: any) {
  console.log(`⚠️ Kubernetes not available: ${error.message}`)
  console.log(`💡 Falling back to Docker deployment...`)
  useK8s = false
}

const appsApi = useK8s ? kc!.makeApiClient(k8s.AppsV1Api) : null
const coreApi = useK8s ? kc!.makeApiClient(k8s.CoreV1Api) : null
const networkingApi = useK8s ? kc!.makeApiClient(k8s.NetworkingV1Api) : null
const autoscalingApi = useK8s ? kc!.makeApiClient(k8s.AutoscalingV1Api) : null

const NAMESPACE = 'smartdeploy'

export async function ensureNamespace() {
  if (!useK8s) return false
  
  try {
    await coreApi!.readNamespace(NAMESPACE)
    console.log(`✅ Namespace ${NAMESPACE} exists`)
  } catch (error: any) {
    if (error.response?.statusCode === 404) {
      const namespace = { metadata: { name: NAMESPACE } }
      await coreApi!.createNamespace(namespace)
      console.log(`✅ Namespace ${NAMESPACE} created`)
    } else {
      console.log(`⚠️ Cannot access namespace: ${error.message}`)
      useK8s = false
      return false
    }
  }
  return true
}

export async function deployToK8s(
  projectId: string,
  imageName: string,
  deploymentId: string,
  port: number = 80,
  subdomain: string
) {
  // Fallback ke Docker jika K8s tidak tersedia
  if (!useK8s) {
    console.log(`⚠️ Kubernetes unavailable, falling back to Docker...`)
    return deployToDocker(projectId, imageName, port, subdomain)
  }
  
  await ensureNamespace()
  
  const appName = `app-${projectId}`
  const hostname = `${subdomain}${process.env.DOMAIN_SUFFIX || ".localhost"}`
  
  console.log(`☸️ Deploying to Kubernetes: ${appName}`)
  
  const deployment = {
    metadata: {
      name: appName,
      labels: { app: projectId }
    },
    spec: {
      replicas: 2,
      selector: { matchLabels: { app: projectId } },
      template: {
        metadata: { labels: { app: projectId } },
        spec: {
          containers: [{
            name: 'app',
            image: imageName,
            ports: [{ containerPort: port }],
            resources: {
              requests: { cpu: '100m', memory: '128Mi' },
              limits: { cpu: '500m', memory: '512Mi' }
            }
          }]
        }
      }
    }
  }
  
  const service = {
    metadata: { name: `svc-${projectId}` },
    spec: {
      selector: { app: projectId },
      ports: [{ port: 80, targetPort: port }],
      type: 'ClusterIP'
    }
  }
  
  try {
    await appsApi!.createNamespacedDeployment(NAMESPACE, deployment)
    console.log(`✅ Deployment created`)
    
    await coreApi!.createNamespacedService(NAMESPACE, service)
    console.log(`✅ Service created`)
    
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'running', port: 80 }
    })
    
    console.log(`🎉 Deployed! http://${hostname}`)
    return true
  } catch (error) {
    console.error('❌ K8s deploy error:', error)
    throw error
  }
}

// Fallback ke Docker
async function deployToDocker(
  projectId: string,
  imageName: string,
  port: number,
  subdomain: string
) {
  const containerName = `app-${projectId}`
  const hostPort = 30000 + Math.floor(Math.random() * 1000)
  
  console.log(`🐳 Deploying to Docker: ${containerName} on port ${hostPort}`)
  
  try {
    // Hapus container lama
    try {
      const oldContainer = docker.getContainer(containerName)
      await oldContainer.stop()
      await oldContainer.remove()
    } catch (e) {}
    
    // Buat container baru
    const container = await docker.createContainer({
      name: containerName,
      Image: imageName,
      ExposedPorts: { [`${port}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${port}/tcp`]: [{ HostPort: `${hostPort}` }] },
        RestartPolicy: { Name: 'unless-stopped' }
      }
    })
    
    await container.start()
    console.log(`✅ Container started on port ${hostPort}`)
    
    // Update Nginx config
    const fs = await import('fs/promises')
    const configFile = `/etc/nginx/sites-available/${subdomain}`
    const configContent = `server {
    listen 80;
    server_name ${subdomain}${process.env.DOMAIN_SUFFIX || ".localhost"};
    location / {
        proxy_pass http://127.0.0.1:${hostPort};
        proxy_set_header Host $host;
    }
}
`
    await fs.writeFile(configFile, configContent)
    await execAsync(`sudo ln -sf ${configFile} /etc/nginx/sites-enabled/`)
    await execAsync('sudo systemctl reload nginx')
    
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'running', port: hostPort }
    })
    
    console.log(`🎉 Deployed to Docker! http://${subdomain}${process.env.DOMAIN_SUFFIX || ".localhost"}`)
    return true
  } catch (error) {
    console.error('❌ Docker deploy error:', error)
    throw error
  }
}

export async function deleteDeployment(projectId: string, subdomain?: string) {
  if (useK8s) {
    try {
      await appsApi!.deleteNamespacedDeployment(`app-${projectId}`, NAMESPACE)
      await coreApi!.deleteNamespacedService(`svc-${projectId}`, NAMESPACE)
      console.log(`✅ K8s resources deleted`)
    } catch (e) {}
  } else {
    try {
      const container = docker.getContainer(`app-${projectId}`)
      await container.stop()
      await container.remove()
      console.log(`✅ Container deleted`)
    } catch (e) {}
  }
  
  if (subdomain) {
    try {
      await execAsync(`sudo rm -f /etc/nginx/sites-available/${subdomain}`)
      await execAsync(`sudo rm -f /etc/nginx/sites-enabled/${subdomain}`)
      await execAsync('sudo systemctl reload nginx')
    } catch (e) {}
  }
}
