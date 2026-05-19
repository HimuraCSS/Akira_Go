import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  // Redirect back to the app with the code
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  
  if (error) {
    return NextResponse.redirect(`${appUrl}?error=${error}`)
  }

  if (code && state) {
    return NextResponse.redirect(`${appUrl}?code=${code}&state=${state}`)
  }

  return NextResponse.redirect(appUrl)
}
