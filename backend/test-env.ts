import dotenv from 'dotenv'
import path from 'path'

// Load .env manually
dotenv.config({ path: path.join(process.cwd(), '.env') })

console.log("=== ENVIRONMENT VARIABLES CHECK ===")
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ EXISTS" : "❌ MISSING")
console.log("REDIS_URL:", process.env.REDIS_URL ? "✅ EXISTS" : "❌ MISSING")
console.log("GITHUB_CLIENT_ID:", process.env.GITHUB_CLIENT_ID ? "✅ EXISTS" : "❌ MISSING")
console.log("GITHUB_CLIENT_SECRET:", process.env.GITHUB_CLIENT_SECRET ? "✅ EXISTS" : "❌ MISSING")
console.log("")
console.log("GITHUB_CLIENT_ID value:", process.env.GITHUB_CLIENT_ID)
