FROM oven/bun:latest
WORKDIR /app

# Copy package.json dulu
COPY backend/package.json ./

# Copy lockfile (baik itu .lockb atau .lock) jika ada
COPY backend/bun.lock* ./

RUN bun install

# Copy sisanya
COPY backend/ .

# Generate prisma client
RUN bunx prisma generate

EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
