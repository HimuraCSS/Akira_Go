import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { code, codeVerifier } = await request.json()

    const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID
    const clientSecret = process.env.MAL_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/mal/callback`

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
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error("MAL token error:", error)
      return NextResponse.json(
        { error: "Failed to exchange code for token" },
        { status: tokenResponse.status }
      )
    }

    const tokenData = await tokenResponse.json()
    return NextResponse.json(tokenData)
  } catch (error) {
    console.error("Token exchange error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
