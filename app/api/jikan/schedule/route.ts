import { NextResponse } from "next/server"
import { fetchAnimeSchedule, translateDay } from "@/lib/jikan-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const day = searchParams.get("day") || undefined
  
  try {
    const schedule = await fetchAnimeSchedule(day)
    
    // Translate day names to Portuguese
    const translatedSchedule: Record<string, unknown> = {}
    for (const [dayKey, animes] of Object.entries(schedule)) {
      translatedSchedule[translateDay(dayKey)] = animes
    }
    
    return NextResponse.json({ schedule: translatedSchedule })
  } catch (error) {
    console.error("[API] Jikan schedule error:", error)
    return NextResponse.json({ error: "Failed to fetch schedule", schedule: {} }, { status: 500 })
  }
}
