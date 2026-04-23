import { Elysia, t } from 'elysia'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs/promises'

const execAsync = promisify(exec)

export const monitoringRoutes = new Elysia({ prefix: '/monitoring' })
  
  // 🔥 GET /monitoring - Full system info
  .get('/', async () => {
    const info = await getFullSystemInfo()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: info
    }
  })
  
  // 🔥 GET /monitoring/cpu - CPU usage only
  .get('/cpu', async () => {
    const cpu = await getCPUInfo()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: cpu
    }
  })
  
  // 🔥 GET /monitoring/memory - Memory usage only
  .get('/memory', async () => {
    const mem = await getMemoryInfo()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: mem
    }
  })
  
  // 🔥 GET /monitoring/disk - Disk usage only
  .get('/disk', async () => {
    const disk = await getDiskInfo()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: disk
    }
  })
  
  // 🔥 GET /monitoring/docker - Docker containers status
  .get('/docker', async () => {
    const docker = await getDockerInfo()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: docker
    }
  })
  
  // 🔥 GET /monitoring/network - Network stats
  .get('/network', async () => {
    const network = await getNetworkInfo()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: network
    }
  })
  
  // 🔥 GET /monitoring/processes - Top processes
  .get('/processes', async ({ query }) => {
    const limit = parseInt(query.limit as string) || 10
    const processes = await getTopProcesses(limit)
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: processes
    }
  })
  
  // 🔥 GET /monitoring/health - Simple health check
  .get('/health', () => {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  })
  
  // 🔥 GET /monitoring/history - Historical data (last 1 hour)
  .get('/history', async () => {
    const history = await getHistoricalData()
    return {
      success: true,
      timestamp: new Date().toISOString(),
      data: history
    }
  })

// ============================================
// Helper Functions
// ============================================

async function getFullSystemInfo() {
  const [cpu, memory, disk, docker, uptime, loadAvg] = await Promise.all([
    getCPUInfo(),
    getMemoryInfo(),
    getDiskInfo(),
    getDockerInfo().catch(() => ({ error: 'Docker not available' })),
    getUptime(),
    getLoadAverage()
  ])
  
  return {
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      uptime,
      loadAverage: loadAvg
    },
    cpu,
    memory,
    disk,
    docker,
    nodejs: {
      version: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  }
}

async function getCPUInfo() {
  const cpus = os.cpus()
  
  // Get CPU usage from /proc/stat (Linux)
  try {
    const { stdout } = await execAsync("cat /proc/stat | grep '^cpu '")
    const parts = stdout.trim().split(/\s+/)
    const user = parseInt(parts[1]) || 0
    const nice = parseInt(parts[2]) || 0
    const system = parseInt(parts[3]) || 0
    const idle = parseInt(parts[4]) || 0
    const iowait = parseInt(parts[5]) || 0
    const irq = parseInt(parts[6]) || 0
    const softirq = parseInt(parts[7]) || 0
    
    const total = user + nice + system + idle + iowait + irq + softirq
    const used = total - idle
    
    return {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      speed: cpus[0]?.speed || 0,
      usage: {
        user,
        nice,
        system,
        idle,
        iowait,
        irq,
        softirq,
        total,
        percentUsed: ((used / total) * 100).toFixed(2)
      },
      perCore: cpus.map((cpu, i) => ({
        core: i,
        model: cpu.model,
        speed: cpu.speed
      }))
    }
  } catch {
    // Fallback for non-Linux
    return {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      speed: cpus[0]?.speed || 0,
      usage: { percentUsed: 'N/A' }
    }
  }
}

async function getMemoryInfo() {
  try {
    const { stdout } = await execAsync('free -b')
    const lines = stdout.trim().split('\n')
    const memLine = lines[1].split(/\s+/)
    
    const total = parseInt(memLine[1])
    const used = parseInt(memLine[2])
    const free = parseInt(memLine[3])
    const shared = parseInt(memLine[4])
    const cache = parseInt(memLine[5])
    const available = parseInt(memLine[6])
    
    return {
      total,
      used,
      free,
      shared,
      cache,
      available,
      percentUsed: ((used / total) * 100).toFixed(2),
      percentAvailable: ((available / total) * 100).toFixed(2),
      // Human readable
      human: {
        total: formatBytes(total),
        used: formatBytes(used),
        free: formatBytes(free),
        available: formatBytes(available)
      }
    }
  } catch {
    const total = os.totalmem()
    const free = os.freemem()
    const used = total - free
    
    return {
      total,
      used,
      free,
      percentUsed: ((used / total) * 100).toFixed(2),
      human: {
        total: formatBytes(total),
        used: formatBytes(used),
        free: formatBytes(free)
      }
    }
  }
}

async function getDiskInfo() {
  try {
    const { stdout } = await execAsync('df -B1 /')
    const lines = stdout.trim().split('\n')
    const diskLine = lines[1].split(/\s+/)
    
    const total = parseInt(diskLine[1])
    const used = parseInt(diskLine[2])
    const available = parseInt(diskLine[3])
    const percentUsed = diskLine[4].replace('%', '')
    
    return {
      total,
      used,
      available,
      percentUsed,
      human: {
        total: formatBytes(total),
        used: formatBytes(used),
        available: formatBytes(available)
      }
    }
  } catch {
    return { error: 'Could not get disk info' }
  }
}

async function getDockerInfo() {
  try {
    const { stdout: containers } = await execAsync("docker ps --format '{{.Names}}|{{.Status}}|{{.Image}}'")
    const { stdout: stats } = await execAsync("docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}'")
    
    const containerList = containers.trim().split('\n').filter(Boolean).map(line => {
      const [name, status, image] = line.split('|')
      return { name, status, image }
    })
    
    const statsList = stats.trim().split('\n').filter(Boolean).map(line => {
      const [name, cpu, memPerc, memUsage] = line.split('|')
      return { name, cpu, memPercent: memPerc, memUsage }
    })
    
    // Merge container info with stats
    const containersWithStats = containerList.map(c => {
      const stat = statsList.find(s => s.name === c.name)
      return { ...c, stats: stat || null }
    })
    
    const running = containersWithStats.filter(c => c.status.includes('Up')).length
    const total = containersWithStats.length
    
    return {
      running,
      total,
      containers: containersWithStats
    }
  } catch {
    return { error: 'Docker not available or not running' }
  }
}

async function getNetworkInfo() {
  const interfaces = os.networkInterfaces()
  const result: any = {}
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (addrs) {
      result[name] = addrs.map(addr => ({
        address: addr.address,
        netmask: addr.netmask,
        family: addr.family,
        mac: addr.mac,
        internal: addr.internal
      }))
    }
  }
  
  return result
}

async function getTopProcesses(limit: number = 10) {
  try {
    const { stdout } = await execAsync(`ps aux --sort=-%cpu | head -${limit + 1}`)
    const lines = stdout.trim().split('\n')
    const headers = lines[0].split(/\s+/)
    const processes = lines.slice(1).map(line => {
      const parts = line.split(/\s+/)
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        vsz: parts[4],
        rss: parts[5],
        tty: parts[6],
        stat: parts[7],
        start: parts[8],
        time: parts[9],
        command: parts.slice(10).join(' ')
      }
    })
    
    return processes
  } catch {
    return { error: 'Could not get process list' }
  }
}

async function getUptime() {
  const uptime = os.uptime()
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  
  return {
    seconds: uptime,
    formatted: `${days}d ${hours}h ${minutes}m`
  }
}

async function getLoadAverage() {
  const load = os.loadavg()
  return {
    '1min': load[0].toFixed(2),
    '5min': load[1].toFixed(2),
    '15min': load[2].toFixed(2)
  }
}

async function getHistoricalData() {
  // Simple in-memory history (bisa diganti dengan Redis/DB)
  const now = Date.now()
  const history = []
  
  for (let i = 0; i < 12; i++) {
    const timestamp = new Date(now - (11 - i) * 5 * 60 * 1000)
    const mem = await getMemoryInfo()
    history.push({
      timestamp: timestamp.toISOString(),
      memory: {
        percentUsed: mem.percentUsed,
        used: mem.human?.used || formatBytes(mem.used)
      }
    })
  }
  
  return history
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}