import { docker } from '../lib/docker'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'

const REGISTRY = 'localhost:5000'

export async function buildImage(
  projectName: string,
  codePath: string,
  onProgress: (log: string) => void
): Promise<string> {
  const imageName = `${REGISTRY}/paas/${projectName}:latest`
  const tarPath = path.join('/tmp', `${projectName}-${Date.now()}.tar`)

  // Create tar archive
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(tarPath)
    const archive = archiver('tar', { gzip: false })

    output.on('close', () => resolve())
    archive.on('error', (err) => reject(err))

    archive.pipe(output)
    archive.directory(codePath, false)
    archive.finalize()
  })

  // 🔥 PENTING: Definisikan tarStream
  const tarStream = fs.createReadStream(tarPath)

  // Build Docker image
  return new Promise((resolve, reject) => {
    docker.buildImage(
      tarStream,
      { t: imageName, rm: true, forcerm: true },
      (err, stream) => {
        if (err) {
          if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath)
          reject(err)
          return
        }

        if (!stream) {
          if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath)
          reject(new Error('No stream returned'))
          return
        }

        let buildError = false

        docker.modem.followProgress(
          stream,
          (err) => {
            if (fs.existsSync(tarPath)) fs.unlinkSync(tarPath)
            if (err) {
              reject(err)
            } else if (buildError) {
              // 🔥 Jika ada error saat build, reject!
              reject(new Error('Docker build failed - check logs for details'))
            } else {
              resolve(imageName)
            }
          },
          (event) => {
            if (event.stream) onProgress(event.stream)
            if (event.error) {
              onProgress(`ERROR: ${event.error}\n`)
              buildError = true  // 🔥 Mark as failed
            }
            if (event.status) onProgress(`${event.status} ${event.id || ''}\n`)
          }
        )
      }
    )
  })
}

export async function pushImage(imageName: string): Promise<void> {
  console.log(`📤 Pushing ${imageName}...`)
  
  const image = docker.getImage(imageName)
  
  return new Promise((resolve, reject) => {
    image.push({}, (err, stream) => {
      if (err) {
        reject(err)
        return
      }
      
      if (!stream) {
        reject(new Error('No stream returned'))
        return
      }
      
      docker.modem.followProgress(stream, (err) => {
        if (err) reject(err)
        else {
          console.log(`✅ Pushed ${imageName}`)
          resolve()
        }
      })
    })
  })
}

export async function removeImage(imageName: string): Promise<void> {
  try {
    const image = docker.getImage(imageName)
    await image.remove()
  } catch {}
}

export async function imageExists(imageName: string): Promise<boolean> {
  try {
    const image = docker.getImage(imageName)
    await image.inspect()
    return true
  } catch {
    return false
  }
}