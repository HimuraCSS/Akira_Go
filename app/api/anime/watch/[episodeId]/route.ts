import { NextResponse } from "next/server"

// Use the working Consumet mirror
const CONSUMET_BASE_URL = "https://consumet-api.vercel.app"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "gogoanime"
  const server = searchParams.get("server") || "gogocdn"

  // Skip demo episode IDs
  if (episodeId.startsWith("demo-")) {
    return NextResponse.json({ 
      error: "Demo episode - use addon API with anime title instead",
      sources: [] 
    })
  }

  try {
    const url = `${CONSUMET_BASE_URL}/anime/${provider}/watch/${episodeId}?server=${server}`
    console.log("[API] Watch request:", url)
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      console.log("[API] Watch failed with status:", response.status)
      return NextResponse.json({ 
        error: `Consumet API error: ${response.status}`,
        sources: [] 
      }, { status: response.status })
    }

    const data = await response.json()
    console.log("[API] Watch success, sources:", data.sources?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Consumet watch error:", error)
    return NextResponse.json({ error: "Stream fetch failed", sources: [] }, { status: 500 })
  }
}
