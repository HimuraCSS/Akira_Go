import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    const url = new URL(request.url)
    const status = url.searchParams.get("status") || ""
    const fields = url.searchParams.get("fields") || "list_status"
    const limit = url.searchParams.get("limit") || "100"
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      )
    }

    const apiUrl = new URL("https://api.myanimelist.net/v2/users/@me/animelist")
    if (status) apiUrl.searchParams.set("status", status)
    apiUrl.searchParams.set("fields", fields)
    apiUrl.searchParams.set("limit", limit)
    apiUrl.searchParams.set("sort", "list_updated_at")

    const listResponse = await fetch(apiUrl.toString(), {
      headers: {
        Authorization: authHeader,
      },
    })

    if (!listResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch anime list" },
        { status: listResponse.status }
      )
    }

    const listData = await listResponse.json()
    return NextResponse.json(listData)
  } catch (error) {
    console.error("Anime list fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
