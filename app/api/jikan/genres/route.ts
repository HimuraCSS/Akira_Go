import { NextResponse } from "next/server"
import { fetchAnimeGenres, fetchAnimeByGenre } from "@/lib/jikan-api"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const genreId = searchParams.get("id")
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 25
  
  try {
    // If genre ID is provided, fetch anime for that genre
    if (genreId) {
      const animes = await fetchAnimeByGenre(parseInt(genreId), limit)
      return NextResponse.json({ animes, count: animes.length })
    }
    
    // Otherwise, return list of all genres
    const genres = await fetchAnimeGenres()
    
    // Translate genre names
    const genreTranslations: Record<string, string> = {
      "Action": "Acao",
      "Adventure": "Aventura",
      "Comedy": "Comedia",
      "Drama": "Drama",
      "Fantasy": "Fantasia",
      "Horror": "Terror",
      "Mystery": "Misterio",
      "Romance": "Romance",
      "Sci-Fi": "Ficcao Cientifica",
      "Slice of Life": "Slice of Life",
      "Sports": "Esportes",
      "Supernatural": "Sobrenatural",
      "Thriller": "Suspense",
      "Suspense": "Suspense",
      "Award Winning": "Premiados",
      "Boys Love": "Boys Love",
      "Girls Love": "Girls Love",
      "Gourmet": "Gastronomia",
      "Ecchi": "Ecchi",
      "Isekai": "Isekai",
      "Mecha": "Mecha",
      "Music": "Musica",
      "Parody": "Parodia",
      "Psychological": "Psicologico",
      "School": "Escolar",
      "Shounen": "Shounen",
      "Shoujo": "Shoujo",
      "Seinen": "Seinen",
      "Josei": "Josei",
    }
    
    const translatedGenres = genres.map(g => ({
      ...g,
      namePt: genreTranslations[g.name] || g.name
    }))
    
    return NextResponse.json({ genres: translatedGenres })
  } catch (error) {
    console.error("[API] Jikan genres error:", error)
    return NextResponse.json({ error: "Failed to fetch genres", genres: [] }, { status: 500 })
  }
}
