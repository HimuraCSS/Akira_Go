import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url, username, password } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      )
    }

    const baseUrl = url.replace(/\/$/, "")

    // First test connection with status endpoint
    const statusResponse = await fetch(`${baseUrl}/api/v1/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: "Failed to connect to Seanime server" },
        { status: 502 }
      )
    }

    const status = await statusResponse.json()

    // If credentials provided, attempt login
    let token = null
    if (username && password) {
      try {
        const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        })

        if (loginResponse.ok) {
          const loginData = await loginResponse.json()
          token = loginData.token
        }
      } catch (loginError) {
        // Login failed but connection works, continue without auth
        console.warn("Seanime login failed, continuing without auth")
      }
    }

    return NextResponse.json({
      success: true,
      version: status.version || "unknown",
      token,
    })
  } catch (error) {
    console.error("Seanime connect error:", error)
    return NextResponse.json(
      { error: "Failed to connect to Seanime server" },
      { status: 500 }
    )
  }
}
