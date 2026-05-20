import { NextRequest, NextResponse } from "next/server"
import { ShokoClient } from "@/lib/shoko-api"

export const dynamic = "force-dynamic"

/**
 * POST /api/shoko/connect
 * Test connection to Shoko Server
 */
export async function POST(request: NextRequest) {
  try {
    const { baseUrl, apiKey } = await request.json()

    if (!baseUrl || !apiKey) {
      return NextResponse.json(
        { success: false, error: "URL e API Key sao obrigatorios" },
        { status: 400 }
      )
    }

    const client = new ShokoClient({ baseUrl, apiKey })
    const result = await client.testConnection()

    if (result.success) {
      // Get user info to confirm full access
      try {
        const user = await client.getCurrentUser()
        return NextResponse.json({
          success: true,
          version: result.version,
          user: {
            id: user.ID,
            username: user.Username,
            isAdmin: user.IsAdmin,
          },
        })
      } catch {
        return NextResponse.json({
          success: true,
          version: result.version,
          user: null,
        })
      }
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    )
  } catch (error) {
    console.error("[Shoko] Connection error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao conectar ao Shoko Server" },
      { status: 500 }
    )
  }
}
