import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  const errorDescription = url.searchParams.get("error_description")

  // Get the app URL, ensuring it's properly formed
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const redirectUrl = new URL(appUrl)
  
  if (error) {
    redirectUrl.searchParams.set("error", error)
    if (errorDescription) {
      redirectUrl.searchParams.set("error_description", errorDescription)
    }
    return NextResponse.redirect(redirectUrl.toString())
  }

  if (code && state) {
    redirectUrl.searchParams.set("code", code)
    redirectUrl.searchParams.set("state", state)
    return NextResponse.redirect(redirectUrl.toString())
  }

  return NextResponse.redirect(redirectUrl.toString())
}
