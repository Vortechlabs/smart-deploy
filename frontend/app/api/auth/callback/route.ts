export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  // Ambil URL Backend dari Env (di lokal: http://localhost:3000, di VPS: http://41.216.191.42/api-backend)
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  console.log("📞 Callback received, code:", code?.substring(0, 5))
  
  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
  
  try {
    // 1. Tukar code ke backend lu (fleksibel pake env)
    const response = await fetch(`${BACKEND_URL}/auth/github/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    
    const data = await response.json()
    
    if (data.success && data.token) {
      // 2. Redirect balik ke Home secara dinamis (ngikutin asal request)
      // request.url bakal otomatis jadi localhost:3001 pas di laptop
      // dan jadi 41.216.191.42 pas di VPS
      const redirectUrl = new URL('/', request.url)
      const responseObj = NextResponse.redirect(redirectUrl)
      
      // 3. Set Cookie token
      responseObj.cookies.set('github_token', data.token, {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      })
      
      return responseObj
    }
    
    return NextResponse.redirect(new URL('/?error=invalid_token', request.url))
    
  } catch (err: any) {
    console.error('❌ Error:', err.message)
    return NextResponse.redirect(new URL('/?error=server_error', request.url))
  }
}