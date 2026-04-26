// backend/src/services/geminiService.ts
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODELS = [
  'gemini-2.0-flash-lite',  // Lebih ringan, quota lebih banyak
  'gemini-1.5-flash',
  'gemini-1.5-pro',
]

export async function analyzeBuildError(errorLogs: string): Promise<string | null> {
  if (!GEMINI_API_KEY) {
    return null // Jangan tampilkan apapun kalau API key gak ada
  }
  
  console.log('🤖 Calling Gemini AI...')
  
  // 🔥 Ambil hanya error terakhir (lebih singkat)
  const shortLogs = errorLogs.split('\n').slice(-20).join('\n')
  
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`📤 Trying model: ${model}`)
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
      
      const prompt = `Analyze this Docker build error and provide a FIX in ONE LINE:

${shortLogs.slice(-1000)}

Format: 🔴 Root cause: [1 sentence] \n✅ Fix: [1 sentence]`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150 }
        })
      })
      
      const data = await response.json()
      
      if (data.error?.status === 'RESOURCE_EXHAUSTED') {
        console.log(`⚠️ ${model} quota exceeded`)
        continue
      }
      
      if (data.error) {
        console.error(`❌ ${model} error:`, data.error.message)
        continue
      }
      
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (result) {
        console.log(`✅ AI success!`)
        return result.trim()
      }
      
    } catch (e: any) {
      console.log(`❌ ${model} failed:`, e.message)
    }
  }
  
  // Kalau semua gagal, return null (jangan tampilkan apapun)
  return null
}