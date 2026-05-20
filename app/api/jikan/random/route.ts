import { NextResponse } from "next/server"
import { fetchRandomAnime } from "@/lib/jikan-api"

export async function GET() {
  try {
    const anime = await fetchRandomAnime()
    
    if (!anime) {
      return NextResponse.json({ error: "Failed to get random anime" }, { status: 500 })
    }
    
    return NextResponse.json({ anime })
  } catch (error) {
    console.error("[API] Jikan random error:", error)
    return NextResponse.json({ error: "Failed to fetch random anime" }, { status: 500 })
  }
}
