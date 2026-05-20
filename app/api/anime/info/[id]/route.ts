import { NextResponse } from "next/server"

// Use amvstrm API
const AMVSTRM_URL = "https://api.amvstr.me/api/v2"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const url = `${AMVSTRM_URL}/info/${id}`
    console.log("[API] Info request:", url)
    
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.log("[API] Info failed with status:", response.status)
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status })
    }

    const text = await response.text()
    if (!text.startsWith("{")) {
      return NextResponse.json({ error: "Invalid response" }, { status: 500 })
    }

    const data = JSON.parse(text)
    console.log("[API] Info success, episodes:", data.episodes?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Info error:", error)
    return NextResponse.json({ error: "Info fetch failed" }, { status: 500 })
  }
}
