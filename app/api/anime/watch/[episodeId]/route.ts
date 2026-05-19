import { NextResponse } from "next/server"

const CONSUMET_BASE_URL = "https://api.consumet.org"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  const { episodeId } = await params
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "gogoanime"
  const server = searchParams.get("server") || "gogocdn"

  try {
    const response = await fetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/watch/${episodeId}?server=${server}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      }
    )

    if (!response.ok) {
      throw new Error(`Consumet API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Consumet watch error:", error)
    return NextResponse.json({ error: "Stream fetch failed" }, { status: 500 })
  }
}
