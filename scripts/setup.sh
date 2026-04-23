#!/bin/bash

echo "🚀 Setting up Personal PaaS..."

# 1. Create .env file (Tetap sama)
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit .env file with your GitHub OAuth credentials"
fi

# 2. Ganti docker-compose (pakai strip) jadi docker compose (pakai spasi)
# Ini solusi buat error 'distutils' tadi.
echo "📦 Starting PostgreSQL and Redis..."
docker compose -f docker-compose.dev.yml up -d

# 3. Tambahin waktu tunggu. 5 detik kadang kurang buat Postgres "bangun".
# Kita kasih 10 detik biar aman.
echo "⏳ Waiting for databases to be ready..."
sleep 10

# Setup backend
echo "🔧 Setting up backend..."
cd backend
bun install

# 4. Gunakan bun x dotenv agar Prisma v7 dapet environment variable-nya dengan pasti
echo "🏗️  Generating Prisma Client..."
bun x prisma generate

echo "🚚 Running Database Migrations..."
# Pakai --name init biar dia nggak nanya-nanya nama migration lagi pas setup awal
bun x dotenv -- prisma migrate dev --name init

# Setup frontend
echo "🎨 Setting up frontend..."
cd ../frontend
bun install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  Terminal 1 (Backend): cd backend && bun run dev"
echo "  Terminal 2 (Worker):  cd backend && bun run worker"
echo "  Terminal 3 (Frontend): cd frontend && bun run dev"
echo ""
echo "Then visit: http://localhost:3001"