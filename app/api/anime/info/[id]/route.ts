import { NextResponse } from "next/server"

const CONSUMET_BASE_URL = "https://api.consumet.org"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get("provider") || "gogoanime"

  try {
    const response = await fetch(
      `${CONSUMET_BASE_URL}/anime/${provider}/info/${id}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!response.ok) {
      throw new Error(`Consumet API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[API] Consumet info error:", error)
    return NextResponse.json({ error: "Info fetch failed" }, { status: 500 })
  }
}
