import { NextResponse } from "next/server"

// Use the working Consumet mirror
const CONSUMET_BASE_URL = "https://consumet-api.vercel.app"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "gogoanime"

  try {
    const url = `${CONSUMET_BASE_URL}/anime/${provider}/info/${id}`
    console.log("[API] Info request:", url)
    
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
      },
    })

    if (!response.ok) {
      console.log("[API] Info failed with status:", response.status)
      return NextResponse.json({ error: `API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    console.log("[API] Info success, episodes:", data.episodes?.length || 0)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Consumet info error:", error)
    return NextResponse.json({ error: "Info fetch failed" }, { status: 500 })
  }
}
