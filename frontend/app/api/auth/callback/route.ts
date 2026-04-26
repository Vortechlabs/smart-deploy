export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/auth/github/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    
    const data = await response.json()
    
    if (data.success && data.token) {
      const redirectUrl = new URL('/', request.url)
      const responseObj = NextResponse.redirect(redirectUrl)
      
      // 🔥 Set cookie (httpOnly: false biar JS bisa baca)
      responseObj.cookies.set('github_token', data.token, {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30, // 30 hari
        path: '/',
        sameSite: 'lax',
      })
      
      // 🔥 Juga simpan user info
      responseObj.cookies.set('user_info', JSON.stringify(data.user), {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      })
      
      return responseObj
    }
    
    return NextResponse.redirect(new URL('/?error=invalid_token', request.url))
    
  } catch (err: any) {
    console.error('❌ Callback error:', err.message)
    return NextResponse.redirect(new URL('/?error=server_error', request.url))
  }
}