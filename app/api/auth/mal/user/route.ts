import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      )
    }

    const userResponse = await fetch("https://api.myanimelist.net/v2/users/@me?fields=anime_statistics", {
      headers: {
        Authorization: authHeader,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: userResponse.status }
      )
    }

    const userData = await userResponse.json()
    return NextResponse.json(userData)
  } catch (error) {
    console.error("User fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
