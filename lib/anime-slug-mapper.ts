/**
 * Sistema de Mapeamento de Slugs para Anime
 * 
 * Este módulo gerencia o mapeamento entre MAL IDs e slugs de diferentes providers
 * (UniqueStream, ReAnime, etc). Inclui:
 * - Busca de slugs existentes no banco de dados
 * - Geração automática de slugs a partir do título
 * - Verificação e atualização de slugs
 */

import { createClient } from "@/lib/supabase/client"

export interface SlugMapping {
  id: string
  mal_id: number
  anilist_id: number | null
  title: string
  title_english: string | null
  title_japanese: string | null
  provider: string
  slug: string
  verified: boolean
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export type Provider = 
  | "uniquestream" 
  | "reanime" 
  | "hianime" 
  | "animefire" 
  | "goyabu"
  | "anicrush"
  | "animekai"

// Mapeamento de formatos de slug por provider
const PROVIDER_SLUG_FORMATS: Record<Provider, {
  baseUrl: string
  format: (slug: string, episode: number, type: 'sub' | 'dub') => string
}> = {
  uniquestream: {
    baseUrl: "https://anime.uniquestream.net",
    format: (slug, _ep, _type) => `/watch/${slug}`,
  },
  reanime: {
    baseUrl: "https://reanime.to",
    format: (slug, ep, type) => `/watch/${slug}?ep=${ep}&lang=${type}&server=HD-1`,
  },
  hianime: {
    baseUrl: "https://hianime.ms",
    format: (slug, ep, _type) => `/watch/${slug}?ep=${ep}`,
  },
  animefire: {
    baseUrl: "https://animefire.plus",
    format: (slug, ep, _type) => `/animes/${slug}/${ep}`,
  },
  goyabu: {
    baseUrl: "https://goyabu.io",
    format: (slug, ep, _type) => `/assistir/${slug}-episodio-${ep}`,
  },
  anicrush: {
    baseUrl: "https://anicrush.to",
    format: (slug, ep, type) => `/watch/${slug}?ep=${ep}&type=${type}`,
  },
  animekai: {
    baseUrl: "https://animekai.to",
    format: (slug, ep, type) => `/watch/${slug}?ep=${ep}&lang=${type}`,
  },
}

/**
 * Normaliza um título para formato de slug
 */
export function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "-") // Espaços para hífens
    .replace(/-+/g, "-") // Remove hífens duplicados
    .replace(/^-|-$/g, "") // Remove hífens no início/fim
    .substring(0, 100) // Limita tamanho
}

/**
 * Gera variações de slug para tentar encontrar o anime
 */
export function generateSlugVariations(title: string, titleEnglish?: string | null): string[] {
  const variations: string[] = []
  
  // Slug do título principal
  const mainSlug = titleToSlug(title)
  if (mainSlug) variations.push(mainSlug)
  
  // Slug do título em inglês
  if (titleEnglish) {
    const englishSlug = titleToSlug(titleEnglish)
    if (englishSlug && !variations.includes(englishSlug)) {
      variations.push(englishSlug)
    }
  }
  
  // Variações com sufixos comuns
  const suffixes = ["", "-tv", "-anime", "-sub", "-dub"]
  for (const base of [mainSlug]) {
    for (const suffix of suffixes) {
      const variation = base + suffix
      if (!variations.includes(variation)) {
        variations.push(variation)
      }
    }
  }
  
  return variations.filter(v => v.length > 0)
}

/**
 * Busca o slug de um anime para um provider específico
 */
export async function getSlugMapping(
  malId: number,
  provider: Provider
): Promise<SlugMapping | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("anime_slug_mappings")
    .select("*")
    .eq("mal_id", malId)
    .eq("provider", provider)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data as SlugMapping
}

/**
 * Busca todos os slugs de um anime para todos os providers
 */
export async function getAllSlugMappings(malId: number): Promise<SlugMapping[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("anime_slug_mappings")
    .select("*")
    .eq("mal_id", malId)
  
  if (error || !data) {
    return []
  }
  
  return data as SlugMapping[]
}

/**
 * Cria ou atualiza um mapeamento de slug
 */
export async function upsertSlugMapping(mapping: {
  mal_id: number
  anilist_id?: number | null
  title: string
  title_english?: string | null
  title_japanese?: string | null
  provider: Provider
  slug: string
  verified?: boolean
}): Promise<SlugMapping | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("anime_slug_mappings")
    .upsert({
      mal_id: mapping.mal_id,
      anilist_id: mapping.anilist_id || null,
      title: mapping.title,
      title_english: mapping.title_english || null,
      title_japanese: mapping.title_japanese || null,
      provider: mapping.provider,
      slug: mapping.slug,
      verified: mapping.verified ?? false,
      last_verified_at: mapping.verified ? new Date().toISOString() : null,
    }, {
      onConflict: "mal_id,provider",
    })
    .select()
    .single()
  
  if (error) {
    console.error("Error upserting slug mapping:", error)
    return null
  }
  
  return data as SlugMapping
}

/**
 * Gera a URL completa para um episódio em um provider
 */
export function generateProviderUrl(
  provider: Provider,
  slug: string,
  episode: number,
  type: 'sub' | 'dub' = 'sub'
): string {
  const config = PROVIDER_SLUG_FORMATS[provider]
  if (!config) {
    return ""
  }
  
  return config.baseUrl + config.format(slug, episode, type)
}

/**
 * Busca ou gera automaticamente o slug para um anime
 * Se não existir no banco, tenta gerar a partir do título
 */
export async function getOrGenerateSlug(
  malId: number,
  provider: Provider,
  animeInfo: {
    title: string
    title_english?: string | null
    title_japanese?: string | null
    anilist_id?: number | null
  }
): Promise<{ slug: string; isGenerated: boolean; mapping: SlugMapping | null }> {
  // Primeiro, tenta buscar do banco de dados
  const existingMapping = await getSlugMapping(malId, provider)
  
  if (existingMapping) {
    return {
      slug: existingMapping.slug,
      isGenerated: false,
      mapping: existingMapping,
    }
  }
  
  // Se não existir, gera automaticamente
  const generatedSlug = titleToSlug(animeInfo.title_english || animeInfo.title)
  
  // Salva o slug gerado no banco para uso futuro
  const newMapping = await upsertSlugMapping({
    mal_id: malId,
    anilist_id: animeInfo.anilist_id,
    title: animeInfo.title,
    title_english: animeInfo.title_english,
    title_japanese: animeInfo.title_japanese,
    provider,
    slug: generatedSlug,
    verified: false, // Não verificado, foi gerado automaticamente
  })
  
  return {
    slug: generatedSlug,
    isGenerated: true,
    mapping: newMapping,
  }
}

/**
 * Marca um slug como verificado (funcional)
 */
export async function verifySlug(malId: number, provider: Provider): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from("anime_slug_mappings")
    .update({
      verified: true,
      last_verified_at: new Date().toISOString(),
    })
    .eq("mal_id", malId)
    .eq("provider", provider)
  
  return !error
}

/**
 * Busca animes por título (para sugestões)
 */
export async function searchSlugsByTitle(
  query: string,
  provider?: Provider
): Promise<SlugMapping[]> {
  const supabase = createClient()
  
  let queryBuilder = supabase
    .from("anime_slug_mappings")
    .select("*")
    .or(`title.ilike.%${query}%,title_english.ilike.%${query}%`)
    .limit(20)
  
  if (provider) {
    queryBuilder = queryBuilder.eq("provider", provider)
  }
  
  const { data, error } = await queryBuilder
  
  if (error || !data) {
    return []
  }
  
  return data as SlugMapping[]
}

/**
 * Importa mapeamentos em lote (para popular o banco inicial)
 */
export async function bulkImportMappings(
  mappings: Array<{
    mal_id: number
    anilist_id?: number | null
    title: string
    title_english?: string | null
    provider: Provider
    slug: string
  }>
): Promise<{ success: number; failed: number }> {
  const supabase = createClient()
  
  let success = 0
  let failed = 0
  
  // Processa em lotes de 100
  const batchSize = 100
  for (let i = 0; i < mappings.length; i += batchSize) {
    const batch = mappings.slice(i, i + batchSize)
    
    const { error } = await supabase
      .from("anime_slug_mappings")
      .upsert(batch.map(m => ({
        mal_id: m.mal_id,
        anilist_id: m.anilist_id || null,
        title: m.title,
        title_english: m.title_english || null,
        provider: m.provider,
        slug: m.slug,
        verified: false,
      })), {
        onConflict: "mal_id,provider",
      })
    
    if (error) {
      console.error("Batch import error:", error)
      failed += batch.length
    } else {
      success += batch.length
    }
  }
  
  return { success, failed }
}
