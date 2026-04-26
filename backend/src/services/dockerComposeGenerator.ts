// backend/src/services/dockerComposeGenerator.ts
import { ProjectStructure } from './languageDetector'

export async function generateDockerCompose(
  projectId: string,
  projectName: string,
  structure: ProjectStructure,
  port: number,
  subdomain: string
): Promise<string> {
  const services: any = {}
  const domain = process.env.NODE_ENV === 'production' 
    ? `${subdomain}.qode.my.id` 
    : `${subdomain}.localhost`
  
  // Database services
  for (const svc of structure.services) {
    if (svc.type === 'mysql') {
      services['mysql'] = {
        image: `mysql:${svc.version || '8.0'}`,
        container_name: `db-${projectId}`,
        restart: 'unless-stopped',
        environment: {
          MYSQL_ROOT_PASSWORD: 'rootpassword',
          MYSQL_DATABASE: `${projectName}_db`,
          MYSQL_USER: projectName,
          MYSQL_PASSWORD: 'userpassword'
        },
        expose: ['3306'],
        volumes: [`mysql-data-${projectId}:/var/lib/mysql`],
        networks: [`app-network-${projectId}`]
      }
      
      services['phpmyadmin'] = {
        image: 'phpmyadmin/phpmyadmin',
        container_name: `pma-${projectId}`,
        restart: 'unless-stopped',
        environment: {
          PMA_HOST: 'mysql',
          PMA_USER: 'root',
          PMA_PASSWORD: 'rootpassword'
        },
        depends_on: ['mysql'],
        networks: [`app-network-${projectId}`]
      }
    } else if (svc.type === 'postgresql') {
      services['postgres'] = {
        image: `postgres:${svc.version || '15'}`,
        container_name: `db-${projectId}`,
        restart: 'unless-stopped',
        environment: {
          POSTGRES_DB: `${projectName}_db`,
          POSTGRES_USER: projectName,
          POSTGRES_PASSWORD: 'userpassword'
        },
        expose: ['5432'],
        volumes: [`postgres-data-${projectId}:/var/lib/postgresql/data`],
        networks: [`app-network-${projectId}`]
      }
    } else if (svc.type === 'redis') {
      services['redis'] = {
        image: 'redis:alpine',
        container_name: `redis-${projectId}`,
        restart: 'unless-stopped',
        expose: ['6379'],
        networks: [`app-network-${projectId}`]
      }
    }
  }
  
  // Application service
  if (structure.type === 'fullstack') {
    services['frontend'] = {
      build: {
        context: `./${structure.frontend!.path}`,
        dockerfile: 'Dockerfile'
      },
      container_name: `frontend-${projectId}`,
      restart: 'unless-stopped',
      expose: [`${structure.frontend!.port}`],
      depends_on: structure.backend ? ['backend'] : [],
      networks: [`app-network-${projectId}`]
    }
    
    services['backend'] = {
      build: {
        context: `./${structure.backend!.path}`,
        dockerfile: 'Dockerfile'
      },
      container_name: `backend-${projectId}`,
      restart: 'unless-stopped',
      expose: [`${structure.backend!.port}`],
      depends_on: structure.services.length > 0 ? [structure.services[0].type] : [],
      networks: [`app-network-${projectId}`]
    }
  } else {
    // 🔥 SINGLE SERVICE - TANPA ENVIRONMENT DATABASE
    services['app'] = {
      build: { context: '.', dockerfile: 'Dockerfile' },
      container_name: `app-${projectId}`,
      restart: 'unless-stopped',
      expose: [`${port}`],
      depends_on: structure.services.length > 0 ? [structure.services[0].type] : [],
      networks: [`app-network-${projectId}`]
    }
  }
  
  // Nginx reverse proxy
  const nginxDepends = structure.type === 'fullstack' 
    ? ['frontend', 'backend'] 
    : ['app']
  
  services['nginx'] = {
    image: 'nginx:alpine',
    container_name: `nginx-${projectId}`,
    restart: 'unless-stopped',
    ports: ['${HOST_PORT}:80'],
    volumes: [`./nginx.conf:/etc/nginx/conf.d/default.conf`],
    depends_on: nginxDepends,
    networks: [`app-network-${projectId}`]
  }
  
  const compose: any = {
    services,
    networks: {
      [`app-network-${projectId}`]: { driver: 'bridge' }
    }
  }
  
  if (structure.services.some(s => s.type === 'mysql')) {
    compose.volumes = { [`mysql-data-${projectId}`]: {} }
  }
  if (structure.services.some(s => s.type === 'postgresql')) {
    compose.volumes = { ...compose.volumes, [`postgres-data-${projectId}`]: {} }
  }
  
  return JSON.stringify(compose, null, 2)
}

export async function generateDockerfile(runtime: string, port: number): Promise<string> {
  switch (runtime) {
    
  case 'laravel':
    return `FROM php:8.2-apache

RUN apt-get update && apt-get install -y \\
    git curl libpng-dev libonig-dev libxml2-dev zip unzip \\
    libzip-dev mariadb-client 2>/dev/null || true

RUN docker-php-ext-install pdo_mysql mysqli mbstring exif pcntl bcmath gd zip 2>/dev/null || true

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN if [ -f composer.json ]; then \\
      composer install --no-interaction --ignore-platform-reqs 2>/dev/null || true; \\
    fi

# 🔥 FIX PERMISSIONS & GENERATE APP_KEY SAAT BUILD
RUN chmod -R 777 storage bootstrap/cache 2>/dev/null || true
RUN echo 'APP_KEY=' >> .env && php artisan key:generate --force 2>/dev/null || true

RUN sed -i 's|/var/www/html|/var/www/html/public|g' /etc/apache2/sites-available/000-default.conf
RUN echo '<Directory /var/www/html/public>\\n  AllowOverride All\\n  Require all granted\\n</Directory>' >> /etc/apache2/apache2.conf
RUN a2enmod rewrite

EXPOSE 80
CMD ["apache2-foreground"]`

    case 'php':
      return `FROM php:8.2-apache

RUN apt-get update && apt-get install -y \\
    git curl libpng-dev libonig-dev libxml2-dev zip unzip mariadb-client 2>/dev/null || true

RUN docker-php-ext-install pdo_mysql mysqli mbstring 2>/dev/null || true

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN if [ -f composer.json ]; then composer install --no-interaction; fi
RUN a2enmod rewrite

EXPOSE ${port}
CMD ["apache2-foreground"]`

    case 'nextjs':
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE ${port}
CMD ["npm", "start"]`

    case 'react':
    case 'vue':
      return `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html 2>/dev/null || true
COPY --from=builder /app/build /usr/share/nginx/html 2>/dev/null || true
RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files \\$uri \\$uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`

    case 'express':
    case 'nestjs':
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build 2>/dev/null || true
EXPOSE ${port}
CMD ["node", "dist/main.js"]`

    case 'node':
      return `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || true
EXPOSE ${port}
CMD ["npm", "start"]`

    case 'python':
      return `FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt 2>/dev/null || pip install -e . 2>/dev/null || true
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

    case 'rust':
      return `FROM rust:1.75-alpine AS builder
RUN apk add musl-dev
WORKDIR /app
COPY . .
RUN cargo build --release 2>/dev/null || true

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/target/release/* /app/app 2>/dev/null || true
EXPOSE ${port}
CMD ["./app"]`

    case 'static':
    default:
      return `FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN echo 'server { listen 80; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files \\$uri \\$uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
  }
}

export async function generateNginxConfig(
  structure: ProjectStructure,
  subdomain: string,
  projectPort?: number
): Promise<string> {
  const domain = process.env.NODE_ENV === 'production' 
    ? `${subdomain}.qode.my.id` 
    : `${subdomain}.localhost`
  
  if (structure.type === 'fullstack') {
    return `server {
    listen 80;
    server_name ${domain};
    
    location / {
        proxy_pass http://frontend:${structure.frontend!.port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /api {
        proxy_pass http://backend:${structure.backend!.port};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /pma/ {
        proxy_pass http://phpmyadmin:80/;
        proxy_set_header Host $host;
    }
}`
  }
  
  const appPort = projectPort || structure.backend!.port || 80
  
  return `server {
    listen 80;
    server_name ${domain};
    
    location / {
        proxy_pass http://app:${appPort};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 🔥 PHPMYADMIN VIA /pma/
    location /pma/ {
        proxy_pass http://phpmyadmin:80/;
        proxy_set_header Host $host;
    }
}`
}