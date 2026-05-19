import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json()

    const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID
    const clientSecret = process.env.MAL_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: "MAL credentials not configured" },
        { status: 500 }
      )
    }

    const tokenResponse = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error("MAL refresh error:", error)
      return NextResponse.json(
        { error: "Failed to refresh token" },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()
    return NextResponse.json(tokenData)
  } catch (error) {
    console.error("Token refresh error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
