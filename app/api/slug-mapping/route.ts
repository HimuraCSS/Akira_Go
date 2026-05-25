import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { 
  titleToSlug, 
  generateSlugVariations,
  type Provider 
} from "@/lib/anime-slug-mapper"

// Cliente Supabase para uso server-side sem cookies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SlugMapping {
  mal_id: number
  anilist_id: number | null
  title: string
  title_english: string | null
  provider: string
  slug: string
  verified: boolean
}

/**
 * GET /api/slug-mapping
 * Busca slug para um anime específico
 * 
 * Query params:
 * - malId: MAL ID do anime (obrigatório)
 * - provider: Nome do provider (opcional, retorna todos se não especificado)
 * - title: Título do anime (para auto-geração se não existir)
 * - titleEnglish: Título em inglês (para auto-geração)
 * - anilistId: AniList ID (para auto-geração)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const malIdStr = searchParams.get("malId")
  const provider = searchParams.get("provider") as Provider | null
  const title = searchParams.get("title")
  const titleEnglish = searchParams.get("titleEnglish")
  const anilistIdStr = searchParams.get("anilistId")
  
  if (!malIdStr) {
    return NextResponse.json(
      { error: "malId is required" },
      { status: 400 }
    )
  }
  
  const malId = parseInt(malIdStr, 10)
  const anilistId = anilistIdStr ? parseInt(anilistIdStr, 10) : null
  
  if (isNaN(malId)) {
    return NextResponse.json(
      { error: "malId must be a number" },
      { status: 400 }
    )
  }
  
  try {
    // Busca slugs existentes
    let query = supabase
      .from("anime_slug_mappings")
      .select("*")
      .eq("mal_id", malId)
    
    if (provider) {
      query = query.eq("provider", provider)
    }
    
    const { data: existingMappings, error } = await query
    
    if (error) {
      console.error("Error fetching slug mappings:", error)
      return NextResponse.json(
        { error: "Failed to fetch slug mappings" },
        { status: 500 }
      )
    }
    
    // Se encontrou mapeamentos, retorna
    if (existingMappings && existingMappings.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          malId,
          mappings: existingMappings,
          isGenerated: false,
        }
      })
    }
    
    // Se não encontrou e tem título, gera automaticamente
    if (title && provider) {
      const generatedSlug = titleToSlug(titleEnglish || title)
      
      // Salva o slug gerado
      const { data: newMapping, error: insertError } = await supabase
        .from("anime_slug_mappings")
        .upsert({
          mal_id: malId,
          anilist_id: anilistId,
          title: title,
          title_english: titleEnglish || null,
          provider: provider,
          slug: generatedSlug,
          verified: false,
        }, {
          onConflict: "mal_id,provider",
        })
        .select()
        .single()
      
      if (insertError) {
        console.error("Error creating slug mapping:", insertError)
      }
      
      return NextResponse.json({
        success: true,
        data: {
          malId,
          mappings: newMapping ? [newMapping] : [{
            mal_id: malId,
            anilist_id: anilistId,
            title: title,
            title_english: titleEnglish,
            provider: provider,
            slug: generatedSlug,
            verified: false,
          }],
          isGenerated: true,
          generatedSlug,
          variations: generateSlugVariations(title, titleEnglish),
        }
      })
    }
    
    // Se não encontrou e não tem título, retorna vazio
    return NextResponse.json({
      success: true,
      data: {
        malId,
        mappings: [],
        isGenerated: false,
      }
    })
    
  } catch (error) {
    console.error("Error in slug mapping API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/slug-mapping
 * Cria ou atualiza um mapeamento de slug
 * 
 * Body:
 * - malId: MAL ID do anime (obrigatório)
 * - provider: Nome do provider (obrigatório)
 * - slug: Slug do anime no provider (obrigatório)
 * - title: Título do anime (obrigatório)
 * - titleEnglish: Título em inglês (opcional)
 * - titleJapanese: Título em japonês (opcional)
 * - anilistId: AniList ID (opcional)
 * - verified: Se o slug foi verificado (opcional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { malId, provider, slug, title, titleEnglish, titleJapanese, anilistId, verified } = body
    
    if (!malId || !provider || !slug || !title) {
      return NextResponse.json(
        { error: "malId, provider, slug, and title are required" },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from("anime_slug_mappings")
      .upsert({
        mal_id: malId,
        anilist_id: anilistId || null,
        title: title,
        title_english: titleEnglish || null,
        title_japanese: titleJapanese || null,
        provider: provider,
        slug: slug,
        verified: verified ?? false,
        last_verified_at: verified ? new Date().toISOString() : null,
      }, {
        onConflict: "mal_id,provider",
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error upserting slug mapping:", error)
      return NextResponse.json(
        { error: "Failed to create/update slug mapping" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data,
    })
    
  } catch (error) {
    console.error("Error in slug mapping POST:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/slug-mapping
 * Verifica um slug como funcional
 * 
 * Body:
 * - malId: MAL ID do anime (obrigatório)
 * - provider: Nome do provider (obrigatório)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { malId, provider } = body
    
    if (!malId || !provider) {
      return NextResponse.json(
        { error: "malId and provider are required" },
        { status: 400 }
      )
    }
    
    const { data, error } = await supabase
      .from("anime_slug_mappings")
      .update({
        verified: true,
        last_verified_at: new Date().toISOString(),
      })
      .eq("mal_id", malId)
      .eq("provider", provider)
      .select()
      .single()
    
    if (error) {
      console.error("Error verifying slug:", error)
      return NextResponse.json(
        { error: "Failed to verify slug" },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data,
    })
    
  } catch (error) {
    console.error("Error in slug mapping PATCH:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
