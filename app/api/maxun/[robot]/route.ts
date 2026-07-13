import { NextResponse } from "next/server"
import { runRobot } from "@/lib/maxun/engine"
import { getRobot, recordToAnimeData } from "@/lib/maxun/robots"

// Turns a robot into a structured API: GET /api/maxun/{robot}?page=1&q=...
export async function GET(
  request: Request,
  { params }: { params: Promise<{ robot: string }> },
) {
  const { robot: robotId } = await params
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const query = searchParams.get("q") || searchParams.get("query") || ""
  const raw = searchParams.get("raw") === "1"

  const robot = getRobot(robotId)
  if (!robot) {
    return NextResponse.json(
      { success: false, error: `Robô "${robotId}" não encontrado` },
      { status: 404 },
    )
  }

  try {
    console.log("[v0] Maxun robot run:", robotId, "page:", page, "query:", query)
    const result = await runRobot(robot, { page, query })

    // Return the raw structured records or app-ready AnimeData.
    const data = raw
      ? result.records
      : result.records
          .map((r) => recordToAnimeData(r, robotId))
          .filter((a) => a.malId && a.image && !a.image.includes("placeholder"))

    return NextResponse.json({
      success: true,
      robot: { id: robot.id, name: robot.name, source: robot.source },
      data,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
      },
      meta: result.meta,
    })
  } catch (error) {
    console.error("[v0] Maxun robot error:", error)
    return NextResponse.json(
      { success: false, error: "Falha ao executar o robô" },
      { status: 500 },
    )
  }
}
