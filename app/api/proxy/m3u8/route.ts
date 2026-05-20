import { NextResponse } from "next/server"

// M3U8 Proxy - Essential for avoiding CORS issues with HLS streams
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const targetUrl = searchParams.get("url")
  const headersParam = searchParams.get("headers")

  if (!targetUrl) {
    return NextResponse.json(
      { error: "URL parameter is required" },
      { status: 400 }
    )
  }

  try {
    // Decode the URL
    const decodedUrl = decodeURIComponent(targetUrl)
    
    // Parse custom headers if provided
    let customHeaders: Record<string, string> = {}
    if (headersParam) {
      try {
        customHeaders = JSON.parse(decodeURIComponent(headersParam))
      } catch {
        // Ignore invalid headers
      }
    }

    // Fetch the resource
    const response = await fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": new URL(decodedUrl).origin,
        "Referer": new URL(decodedUrl).origin + "/",
        ...customHeaders,
      },
    })

    if (!response.ok) {
      console.error("[v0] M3U8 Proxy fetch failed:", response.status, decodedUrl)
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get("content-type") || ""
    
    // For M3U8 playlist files, we need to rewrite the URLs
    if (contentType.includes("mpegurl") || decodedUrl.includes(".m3u8")) {
      const text = await response.text()
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1)
      const proxyBase = `/api/proxy/m3u8?url=`
      
      // Rewrite relative URLs in the M3U8 to go through our proxy
      const rewritten = text.split("\n").map(line => {
        const trimmed = line.trim()
        
        // Skip empty lines and comments (except URI in EXT-X-KEY)
        if (!trimmed || (trimmed.startsWith("#") && !trimmed.includes("URI="))) {
          // Check for URI in EXT-X-KEY
          if (trimmed.includes("URI=")) {
            return trimmed.replace(/URI="([^"]+)"/, (_, uri) => {
              const absoluteUri = uri.startsWith("http") ? uri : baseUrl + uri
              return `URI="${proxyBase}${encodeURIComponent(absoluteUri)}"`
            })
          }
          return line
        }
        
        // Handle segment URLs
        if (trimmed.startsWith("#")) {
          return line
        }
        
        // Convert relative URLs to absolute and proxy them
        const absoluteUrl = trimmed.startsWith("http") ? trimmed : baseUrl + trimmed
        return `${proxyBase}${encodeURIComponent(absoluteUrl)}`
      }).join("\n")
      
      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }
    
    // For TS segments and other binary content, stream directly
    const arrayBuffer = await response.arrayBuffer()
    
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=31536000",
      },
    })
  } catch (error) {
    console.error("[v0] M3U8 Proxy error:", error)
    return NextResponse.json(
      { error: "Proxy fetch failed" },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  })
}
