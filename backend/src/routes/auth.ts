import { Elysia, t } from 'elysia'
import { prisma } from '../lib/prisma'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/github/login', async ({ body, set }) => {
    const { code } = body as { code: string }
    
    const client_id = process.env.GITHUB_CLIENT_ID
    const client_secret = process.env.GITHUB_CLIENT_SECRET

    console.log("🔐 GitHub Client ID exists:", !!client_id)
    console.log("📝 Code received:", code?.substring(0, 20) + "...")

    if (!client_id || !client_secret) {
        console.error("❌ ERROR: GitHub credentials missing!")
        set.status = 500
        return { error: 'Server configuration error' }
    }

    if (!code) {
      set.status = 400
      return { error: 'Code is required' }
    }
    
    try {
      console.log("⏳ Exchanging code for token...")
      
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id,
          client_secret,
          code,
        }),
      })
      
      const tokenData = await tokenRes.json()
      console.log("📦 Token response:", Object.keys(tokenData))
      
      if (tokenData.error) {
        console.error("❌ GitHub error:", tokenData.error_description)
        set.status = 400
        return { error: tokenData.error_description }
      }

      const accessToken = tokenData.access_token
      if (!accessToken) {
        console.error("❌ No access token received")
        set.status = 400
        return { error: 'No access token received' }
      }
      
      console.log("✅ Access token received")
      
      // Get user info
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      })
      
      const githubUser = await userRes.json()
      console.log("👤 GitHub user:", githubUser.login)

      if (!githubUser.id) {
        throw new Error("Failed to get user data")
      }
      
      // Get primary email
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        }
      })
      const emails = await emailsRes.json()
      const primaryEmail = Array.isArray(emails) 
        ? (emails.find((e: any) => e.primary)?.email || emails[0]?.email)
        : githubUser.email
      
      // 🔥 Cek apakah user sudah ada
      const existingUser = await prisma.user.findUnique({
        where: { githubId: String(githubUser.id) }
      })
      
      let user
      
      if (existingUser) {
        // 🔥 User sudah ada - UPDATE token & avatar, tapi JANGAN timpa username/email kustom!
        user = await prisma.user.update({
          where: { githubId: String(githubUser.id) },
          data: {
            githubToken: accessToken,
            avatarUrl: githubUser.avatar_url,
            // Hanya set username/email jika MASIH KOSONG (belum pernah di-custom)
            ...(existingUser.username ? {} : { username: githubUser.login }),
            ...(existingUser.email ? {} : { email: primaryEmail }),
          }
        })
        console.log("✅ User updated (preserved custom settings):", user.username)
      } else {
        // 🔥 User baru - pakai data dari GitHub
        user = await prisma.user.create({
          data: {
            githubId: String(githubUser.id),
            githubToken: accessToken,
            email: primaryEmail,
            username: githubUser.login,
            avatarUrl: githubUser.avatar_url
          }
        })
        console.log("✅ New user created:", user.username)
      }
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          avatarUrl: user.avatarUrl
        },
        token: accessToken
      }
      
    } catch (error: any) {
      console.error('❌ Auth error:', error.message)
      set.status = 500
      return { error: 'Authentication failed: ' + error.message }
    }
  })
  
  .get('/verify', async ({ headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      return { error: 'No token' }
    }
    
    const token = authHeader.substring(7)
    
    const user = await prisma.user.findFirst({
      where: { githubToken: token }
    })
    
    if (!user) {
      set.status = 401
      return { error: 'Invalid token' }
    }
    
    return {
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    }
  })