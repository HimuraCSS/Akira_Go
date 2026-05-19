import { NextResponse } from "next/server"

// Consumet API proxy to avoid CORS issues
const CONSUMET_BASE_URL = "https://api.consumet.org"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const provider = searchParams.get("provider") || "gogoanime"

  if (!query) {
    return NextResponse.json({ error: "Query required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error(`Consumet API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Consumet search error:", error)
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 })
  }
}
