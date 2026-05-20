import { NextResponse } from "next/server"

// Consumet mirrors
const CONSUMET_MIRRORS = [
  "https://consumet-api-five-chi.vercel.app",
  "https://consumet-api-cyan.vercel.app",
  "https://consumet-api-pi.vercel.app",
]

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "gogoanime"

  for (const mirror of CONSUMET_MIRRORS) {
    try {
      const url = `${mirror}/anime/${provider}/info/${id}`
      console.log("[API] Info request:", url)
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      })

      if (!response.ok) continue

      const text = await response.text()
      if (!text.startsWith("{")) continue

      const data = JSON.parse(text)
      console.log("[API] Info success from:", mirror, "episodes:", data.episodes?.length || 0)
      return NextResponse.json(data)
    } catch (error) {
      console.log("[API] Info mirror failed:", mirror, error instanceof Error ? error.message : "Unknown")
      continue
    }
  }

  return NextResponse.json({ error: "Info fetch failed" }, { status: 500 })
}
