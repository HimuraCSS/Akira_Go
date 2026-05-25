import { NextResponse, type NextRequest } from "next/server"

/**
 * Proxy para streams M3U8 e segmentos de video
 * Adiciona headers necessarios (Referer, CORS) para bypassar restricoes
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")
  const referer = searchParams.get("referer") || searchParams.get("ref")
  const type = searchParams.get("type") || "auto" // m3u8, segment, vtt, auto
  
  if (!url) {
    return NextResponse.json(
      { success: false, error: "URL parameter is required" },
      { status: 400 }
    )
  }
  
  try {
    const decodedUrl = decodeURIComponent(url)
    
    // Valida URL
    const parsedUrl = new URL(decodedUrl)
    
    // Headers para a requisicao ao servidor de origem
    const headers: HeadersInit = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
      "Accept-Encoding": "identity", // Nao comprimir para evitar problemas
    }
    
    // Adiciona Referer se fornecido
    if (referer) {
      headers["Referer"] = referer
      headers["Origin"] = new URL(referer).origin
    } else {
      // Usa origem do URL como referer padrao
      headers["Referer"] = parsedUrl.origin + "/"
      headers["Origin"] = parsedUrl.origin
    }
    
    const response = await fetch(decodedUrl, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch: ${response.status} ${response.statusText}`,
          url: decodedUrl
        },
        { status: response.status }
      )
    }
    
    // Determina tipo de conteudo
    const contentType = response.headers.get("content-type") || ""
    const isM3U8 = type === "m3u8" || decodedUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u8")
    const isVTT = type === "vtt" || decodedUrl.includes(".vtt") || contentType.includes("vtt")
    const isSRT = type === "srt" || decodedUrl.includes(".srt")
    const isSegment = type === "segment" || decodedUrl.includes(".ts") || contentType.includes("video/mp2t")
    
    // Para M3U8, precisamos reescrever URLs relativas para usar o proxy
    if (isM3U8) {
      const text = await response.text()
      const baseUrl = decodedUrl.substring(0, decodedUrl.lastIndexOf("/") + 1)
      const proxyBase = `/api/stream/proxy?`
      
      // Reescreve URLs no manifest M3U8
      const rewrittenText = text
        .split("\n")
        .map(line => {
          const trimmed = line.trim()
          
          // Ignora linhas de comentario/tag (exceto URI em tags)
          if (trimmed.startsWith("#")) {
            // Processa URIs em tags como #EXT-X-KEY ou #EXT-X-MAP
            if (trimmed.includes("URI=")) {
              return trimmed.replace(
                /URI="([^"]+)"/g,
                (match, uri) => {
                  const absoluteUrl = uri.startsWith("http") ? uri : new URL(uri, baseUrl).href
                  return `URI="${proxyBase}url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || parsedUrl.origin)}"`
                }
              )
            }
            return line
          }
          
          // Ignora linhas vazias
          if (!trimmed) return line
          
          // URLs absolutas
          if (trimmed.startsWith("http")) {
            return `${proxyBase}url=${encodeURIComponent(trimmed)}&referer=${encodeURIComponent(referer || parsedUrl.origin)}&type=segment`
          }
          
          // URLs relativas - converte para absolutas e passa pelo proxy
          if (trimmed.endsWith(".m3u8")) {
            const absoluteUrl = new URL(trimmed, baseUrl).href
            return `${proxyBase}url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || parsedUrl.origin)}&type=m3u8`
          }
          
          if (trimmed.endsWith(".ts") || trimmed.endsWith(".m4s")) {
            const absoluteUrl = new URL(trimmed, baseUrl).href
            return `${proxyBase}url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || parsedUrl.origin)}&type=segment`
          }
          
          // Outros arquivos
          const absoluteUrl = new URL(trimmed, baseUrl).href
          return `${proxyBase}url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer || parsedUrl.origin)}`
        })
        .join("\n")
      
      return new NextResponse(rewrittenText, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    }
    
    // Para legendas VTT/SRT
    if (isVTT || isSRT) {
      const text = await response.text()
      
      return new NextResponse(text, {
        headers: {
          "Content-Type": isVTT ? "text/vtt" : "text/plain",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      })
    }
    
    // Para segmentos de video, retorna como stream
    const body = response.body
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Empty response body" },
        { status: 500 }
      )
    }
    
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType || "video/mp2t",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error) {
    console.error("[StreamProxy] Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        url: url
      },
      { status: 500 }
    )
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  })
}
