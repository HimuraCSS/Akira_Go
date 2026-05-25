import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { titleToSlug, type Provider } from "@/lib/anime-slug-mapper"

// Cliente Supabase para uso server-side sem cookies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface BulkMapping {
  mal_id: number
  anilist_id?: number | null
  title: string
  title_english?: string | null
  provider: Provider
  slug: string
  verified?: boolean
}

/**
 * POST /api/slug-mapping/bulk
 * Importa mapeamentos em lote
 * 
 * Body:
 * - mappings: Array de mapeamentos
 *   - mal_id: MAL ID do anime (obrigatório)
 *   - provider: Nome do provider (obrigatório)
 *   - slug: Slug do anime no provider (obrigatório)
 *   - title: Título do anime (obrigatório)
 *   - title_english: Título em inglês (opcional)
 *   - anilist_id: AniList ID (opcional)
 *   - verified: Se o slug foi verificado (opcional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { mappings } = body as { mappings: BulkMapping[] }
    
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json(
        { error: "mappings array is required and must not be empty" },
        { status: 400 }
      )
    }
    
    // Validate all mappings
    for (const mapping of mappings) {
      if (!mapping.mal_id || !mapping.provider || !mapping.slug || !mapping.title) {
        return NextResponse.json(
          { error: "Each mapping must have mal_id, provider, slug, and title" },
          { status: 400 }
        )
      }
    }
    
    // Process in batches of 100
    const batchSize = 100
    let success = 0
    let failed = 0
    const errors: string[] = []
    
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from("anime_slug_mappings")
        .upsert(
          batch.map(m => ({
            mal_id: m.mal_id,
            anilist_id: m.anilist_id || null,
            title: m.title,
            title_english: m.title_english || null,
            provider: m.provider,
            slug: m.slug,
            verified: m.verified ?? false,
            last_verified_at: m.verified ? new Date().toISOString() : null,
          })),
          { onConflict: "mal_id,provider" }
        )
      
      if (error) {
        console.error("Batch import error:", error)
        failed += batch.length
        errors.push(`Batch ${i / batchSize + 1}: ${error.message}`)
      } else {
        success += batch.length
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total: mappings.length,
        success,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }
    })
    
  } catch (error) {
    console.error("Error in bulk import:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/slug-mapping/bulk
 * Gera e salva slugs automaticamente para uma lista de animes
 * 
 * Body:
 * - animes: Array de animes
 *   - mal_id: MAL ID do anime (obrigatório)
 *   - title: Título do anime (obrigatório)
 *   - title_english: Título em inglês (opcional)
 *   - anilist_id: AniList ID (opcional)
 * - providers: Array de providers para gerar slugs (opcional, default: todos)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { animes, providers = ["uniquestream", "reanime"] } = body as {
      animes: Array<{
        mal_id: number
        title: string
        title_english?: string | null
        anilist_id?: number | null
      }>
      providers?: Provider[]
    }
    
    if (!animes || !Array.isArray(animes) || animes.length === 0) {
      return NextResponse.json(
        { error: "animes array is required and must not be empty" },
        { status: 400 }
      )
    }
    
    // Generate mappings for each anime and provider
    const mappings: BulkMapping[] = []
    
    for (const anime of animes) {
      const slug = titleToSlug(anime.title_english || anime.title)
      
      for (const provider of providers) {
        mappings.push({
          mal_id: anime.mal_id,
          anilist_id: anime.anilist_id,
          title: anime.title,
          title_english: anime.title_english,
          provider,
          slug,
          verified: false,
        })
      }
    }
    
    // Use the same batch logic
    const batchSize = 100
    let success = 0
    let failed = 0
    
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize)
      
      const { error } = await supabase
        .from("anime_slug_mappings")
        .upsert(
          batch.map(m => ({
            mal_id: m.mal_id,
            anilist_id: m.anilist_id || null,
            title: m.title,
            title_english: m.title_english || null,
            provider: m.provider,
            slug: m.slug,
            verified: false,
          })),
          { onConflict: "mal_id,provider" }
        )
      
      if (error) {
        console.error("Auto-generate batch error:", error)
        failed += batch.length
      } else {
        success += batch.length
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalAnimes: animes.length,
        totalMappings: mappings.length,
        success,
        failed,
      }
    })
    
  } catch (error) {
    console.error("Error in auto-generate:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
