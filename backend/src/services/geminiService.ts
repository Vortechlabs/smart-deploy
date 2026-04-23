// backend/src/services/geminiService.ts

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// 🔥 Model yang TERBUKTI BERHASIL
const GEMINI_MODELS = [
  'gemini-2.5-flash',      // ✅ Sukses
  'gemini-flash-latest',   // ✅ Sukses
  'gemini-2.0-flash'       // Fallback (quota habis)
]

export async function analyzeBuildError(errorLogs: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set')
    return null
  }
  
  console.log('🤖 Calling Gemini AI...')
  
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`📤 Trying model: ${model}`)
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
      
      const prompt = `You are a DevOps expert. Analyze this build error and provide a CONCISE solution in this format:
🔴 Root cause: [one line]
✅ Solution: [one line]
📝 Fix: [one line code fix]

Build Error Logs:
${errorLogs.slice(-2000)}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      })
      
      const data = await response.json()
      
      // Quota exceeded? Try next model
      if (data.error?.status === 'RESOURCE_EXHAUSTED') {
        console.log(`⚠️ ${model} quota exceeded, trying next...`)
        continue
      }
      
      // Success?
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (result) {
        console.log(`✅ ${model} success!`)
        return result
      }
      
    } catch (e: any) {
      console.log(`❌ ${model} failed:`, e.message)
    }
  }
  
  console.log('⚠️ All Gemini models failed')
  return null
}