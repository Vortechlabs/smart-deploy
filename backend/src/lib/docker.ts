import Docker from 'dockerode'

export const docker = new Docker()

// Test connection
docker.ping((err) => {
  if (err) {
    console.error('❌ Docker connection failed:', err)
  } else {
    console.log('✅ Docker connected')
  }
})