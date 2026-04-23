import fs from 'fs/promises'
import path from 'path'

export type Runtime = 'node' | 'python' | 'go' | 'rust' | 'static' | 'unknown'

export async function detectLanguage(repoPath: string): Promise<Runtime> {
  try {
    console.log(`🔍 Detecting language for: ${repoPath}`)
    const files = await fs.readdir(repoPath)
    console.log(`📁 Files found: ${files.slice(0, 15).join(', ')}`)
    
    // 🔥 Cek subfolder (hasil extract ZIP sering ada folder root)
    if (files.length === 1) {
      const subPath = path.join(repoPath, files[0])
      try {
        const stat = await fs.stat(subPath)
        if (stat.isDirectory()) {
          console.log(`📂 Entering subfolder: ${files[0]}`)
          return detectLanguage(subPath)
        }
      } catch {}
    }
    
    const hasIndexHtml = files.includes('index.html') || files.includes('index.htm')
    const hasPackageJson = files.includes('package.json')
    const hasRequirementsTxt = files.includes('requirements.txt')
    const hasGoMod = files.includes('go.mod')
    const hasCargoToml = files.includes('Cargo.toml')
    const hasSetupPy = files.includes('setup.py')
    const hasPyprojectToml = files.includes('pyproject.toml')
    
    console.log(`📄 hasIndexHtml: ${hasIndexHtml}`)
    console.log(`📦 hasPackageJson: ${hasPackageJson}`)
    console.log(`🐍 hasRequirementsTxt: ${hasRequirementsTxt}`)
    
    // Node.js
    if (hasPackageJson) {
      console.log(`✅ Detected as NODE.js`)
      return 'node'
    }
    
    // Python
    if (hasRequirementsTxt || hasSetupPy || hasPyprojectToml) {
      console.log(`✅ Detected as PYTHON`)
      return 'python'
    }
    
    // Go
    if (hasGoMod) {
      console.log(`✅ Detected as GO`)
      return 'go'
    }
    
    // Rust
    if (hasCargoToml) {
      console.log(`✅ Detected as RUST`)
      return 'rust'
    }
    
    // Static HTML - prioritas jika ada index.html
    if (hasIndexHtml) {
      console.log(`✅ Detected as STATIC website`)
      return 'static'
    }
    
    // 🔥 Default: static (serve folder apa adanya dengan nginx)
    console.log(`⚠️ No specific framework detected, defaulting to STATIC`)
    return 'static'
    
  } catch (error) {
    console.error('Error detecting language:', error)
    return 'static'
  }
}

export async function generateDockerfile(runtime: string, port: number): Promise<string> {
  console.log(`🐳 Generating Dockerfile for: ${runtime}, port: ${port}`)
  
  switch (runtime) {
  case 'node':
  return `FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (termasuk devDependencies untuk Next.js)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build Next.js jika ada
RUN if [ -f next.config.ts ] || [ -f next.config.js ] || [ -f next.config.mjs ]; then \
      npm run build; \
    fi

# Expose port
EXPOSE ${port}

# Start app
CMD ["npm", "start"]`

    case 'python':
      return `FROM python:3.11-slim

WORKDIR /app

COPY . .

# Install dependencies
RUN pip install -r requirements.txt 2>/dev/null || true

EXPOSE ${port}

CMD ["python", "app.py"]`

    case 'go':
      return `FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download 2>/dev/null || true

COPY . .
RUN go build -o main . 2>/dev/null || go build -o main *.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/main .

EXPOSE ${port}
CMD ["./main"]`

    case 'static':
      return `FROM nginx:alpine

COPY . /usr/share/nginx/html

# Nginx config for SPA
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`

    default:
      // Default: nginx static
      return `FROM nginx:alpine

COPY . /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
  }
}

export function getStartCommand(runtime: Runtime): string {
  const commands: Record<Runtime, string> = {
    node: 'npm start',
    python: 'python app.py',
    go: './main',
    rust: './app',
    static: 'nginx -g "daemon off;"',
    unknown: 'nginx -g "daemon off;"'
  }
  return commands[runtime] || commands.unknown
}