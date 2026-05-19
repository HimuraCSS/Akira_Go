import { NextResponse } from "next/server"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const { animeId } = await params
    const authHeader = request.headers.get("Authorization")
    const body = await request.json()
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      )
    }

    const formData = new URLSearchParams()
    if (body.status) formData.set("status", body.status)
    if (body.num_watched_episodes !== undefined) {
      formData.set("num_watched_episodes", String(body.num_watched_episodes))
    }
    if (body.score !== undefined) formData.set("score", String(body.score))

    const updateResponse = await fetch(
      `https://api.myanimelist.net/v2/anime/${animeId}/my_list_status`,
      {
        method: "PATCH",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      }
    )

    if (!updateResponse.ok) {
      return NextResponse.json(
        { error: "Failed to update anime status" },
        { status: updateResponse.status }
      )
    }

    const updateData = await updateResponse.json()
    return NextResponse.json(updateData)
  } catch (error) {
    console.error("Anime update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const { animeId } = await params
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header required" },
        { status: 401 }
      )
    }

    const deleteResponse = await fetch(
      `https://api.myanimelist.net/v2/anime/${animeId}/my_list_status`,
      {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      }
    )

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      return NextResponse.json(
        { error: "Failed to delete anime from list" },
        { status: deleteResponse.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Anime delete error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
