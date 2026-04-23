import { Elysia } from 'elysia'

export const stressRoutes = new Elysia({ prefix: '/stress' })
  .get('/cpu', ({ query }) => {
    const duration = parseInt(query.duration as string) || 100
    const intensity = parseInt(query.intensity as string) || 1000000
    
    console.log(`🔥 Stress test started: duration=${duration}ms, intensity=${intensity}`)
    
    const start = Date.now()
    let iterations = 0
    
    // CPU-intensive loop
    while (Date.now() - start < duration) {
      let sum = 0
      for (let i = 0; i < intensity; i++) {
        sum += Math.sqrt(i) * Math.random()
      }
      iterations++
    }
    
    return {
      message: 'CPU stress completed',
      duration: Date.now() - start,
      iterations,
      intensity,
      pid: process.pid
    }
  })
  
  .get('/memory', ({ query }) => {
    const size = parseInt(query.size as string) || 100 // MB
    
    console.log(`🧠 Memory stress test: allocating ${size}MB`)
    
    // Alokasi memory
    const arrays: number[][] = []
    const chunkSize = 1024 * 1024 // 1MB per chunk (approx)
    
    for (let i = 0; i < size; i++) {
      arrays.push(new Array(chunkSize).fill(Math.random()))
    }
    
    // Hold memory for 5 seconds
    return new Promise((resolve) => {
      setTimeout(() => {
        // Clear memory
        arrays.length = 0
        resolve({
          message: 'Memory stress completed',
          allocated: `${size}MB`,
          released: true
        })
      }, 5000)
    })
  })
  
  .get('/health', () => ({ status: 'ok', pid: process.pid }))