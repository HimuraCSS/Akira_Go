import { NextResponse } from "next/server"
import { listRobots } from "@/lib/maxun/robots"

// Lists the available robots (the "structured APIs" this source exposes).
export async function GET() {
  return NextResponse.json({ success: true, robots: listRobots() })
}
