// frontend/app/api/auth/[...nextauth]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
  console.log("📞 Callback received, code:", code?.substring(0, 20))
  
  if (error) {
    console.error("❌ GitHub error param:", error)
    return NextResponse.redirect(new URL('/?error=github_error', request.url))
  }
  
  if (!code) {
    console.error("❌ No code in callback")
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }
  
  try {
    console.log("🔄 Exchanging code with backend...")
    
    const response = await fetch('http://localhost:3000/auth/github/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
    
    const data = await response.json()
    console.log("📦 Backend response:", { success: data.success, hasToken: !!data.token })
    
    if (data.success && data.token) {
      // Buat response redirect
      const redirectUrl = new URL('/', request.url)
      const responseObj = NextResponse.redirect(redirectUrl)
      
      // Set cookie (httpOnly: false biar bisa diakses JS)
      responseObj.cookies.set('github_token', data.token, {
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30, // 30 hari
        path: '/',
        sameSite: 'lax',
      })
      
      // Juga set di header custom untuk debugging
      responseObj.headers.set('X-Auth-Success', 'true')
      
      console.log("✅ Auth success, redirecting to home")
      return responseObj
    }
    
    console.error("❌ Auth failed:", data.error)
    return NextResponse.redirect(new URL('/?error=auth_failed&details=' + encodeURIComponent(data.error || 'unknown'), request.url))
    
  } catch (err: any) {
    console.error('❌ Auth callback error:', err.message)
    return NextResponse.redirect(new URL('/?error=auth_error&details=' + encodeURIComponent(err.message), request.url))
  }
}