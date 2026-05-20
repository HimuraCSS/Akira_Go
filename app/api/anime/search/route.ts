import { NextResponse } from "next/server"

// Use the working Consumet mirror
const CONSUMET_BASE_URL = "https://consumet-api.vercel.app"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const provider = searchParams.get("provider") || "gogoanime"

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  try {
    const url = `${CONSUMET_BASE_URL}/anime/${provider}/${encodeURIComponent(query)}`
    console.log("[API] Search request:", url)
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      console.log("[API] Search failed with status:", response.status)
      return NextResponse.json({ results: [], error: `API error: ${response.status}` })
    }

    const data = await response.json()
    console.log("[API] Search success, results:", data.results?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Consumet search error:", error)
    return NextResponse.json({ results: [], error: "Search failed" })
  }
}
