"use client"

import type { AnimeData } from "@/components/anitracker/anime-card"

// ============================================================================
// AKIRA GO - STRUCTURED ANIME DATABASE
// High-fidelity mock data simulating production API responses
// ============================================================================

export const trendingAnimeList: AnimeData[] = [
  {
    id: "solo-leveling",
    title: "Solo Leveling",
    japaneseTitle: "俺だけレベルアップな件",
    image: "https://cdn.myanimelist.net/images/anime/1908/141597.jpg",
    bannerImage: "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1920&q=85",
    score: 8.9,
    episodes: 12,
    status: "Completed",
    synopsis: "Após ser deixado para morrer em uma masmorra, Sung Jinwoo, o caçador mais fraco da humanidade, desperta com um misterioso Sistema que apenas ele pode ver. Com a habilidade única de subir de nível, ele embarca em uma jornada épica para se tornar o caçador mais poderoso de todos.",
    genres: ["Ação", "Aventura", "Fantasia"],
    year: 2024,
    studio: "A-1 Pictures",
    duration: "24min/ep",
  },
  {
    id: "kaiju-no-8",
    title: "Kaiju No. 8",
    japaneseTitle: "怪獣8号",
    image: "https://cdn.myanimelist.net/images/anime/1032/142086.jpg",
    bannerImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=85",
    score: 8.4,
    episodes: 12,
    status: "Completed",
    synopsis: "Kafka Hibino sempre sonhou em se juntar às Forças de Defesa contra Kaijus ao lado de seu amigo de infância Mina. Após falhar repetidamente nos exames, ele se transforma misteriosamente em um kaiju com aparência humana, tornando-se o temido Kaiju No. 8.",
    genres: ["Ação", "Sci-Fi", "Seinen"],
    year: 2024,
    studio: "Production I.G",
    duration: "23min/ep",
  },
  {
    id: "frieren",
    title: "Frieren: Beyond Journey's End",
    japaneseTitle: "葬送のフリーレン",
    image: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
    bannerImage: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=85",
    score: 9.3,
    episodes: 28,
    status: "Completed",
    synopsis: "Após derrotar o Rei Demônio, a elfa maga Frieren percebe que seus companheiros humanos envelhecem e morrem enquanto ela permanece jovem. Décadas depois, ela embarca em uma jornada para entender as emoções humanas e reencontrar a alma de seu antigo companheiro.",
    genres: ["Aventura", "Drama", "Fantasia"],
    year: 2024,
    studio: "Madhouse",
    duration: "25min/ep",
  },
  {
    id: "jujutsu-kaisen-s2",
    title: "Jujutsu Kaisen 2",
    japaneseTitle: "呪術廻戦 第2期",
    image: "https://cdn.myanimelist.net/images/anime/1792/138022.jpg",
    bannerImage: "https://images.unsplash.com/photo-1557683311-eac922347aa1?w=1920&q=85",
    score: 8.8,
    episodes: 23,
    status: "Completed",
    synopsis: "O passado de Gojo Satoru é revelado enquanto o Incidente de Shibuya se desenrola. Com maldições poderosas conspirando para selar o feiticeiro mais forte, Yuji e seus aliados enfrentam sua batalha mais brutal até agora.",
    genres: ["Ação", "Horror", "Sobrenatural"],
    year: 2023,
    studio: "MAPPA",
    duration: "24min/ep",
  },
  {
    id: "chainsaw-man",
    title: "Chainsaw Man",
    japaneseTitle: "チェンソーマン",
    image: "https://cdn.myanimelist.net/images/anime/1806/126216.jpg",
    bannerImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1920&q=85",
    score: 8.6,
    episodes: 12,
    status: "Completed",
    synopsis: "Denji, um jovem endividado que trabalha como caçador de demônios, se funde com seu demônio motosserra Pochita após ser traído. Agora com poderes devastadores, ele se junta à Divisão de Segurança Pública para caçar demônios em troca de uma vida normal.",
    genres: ["Ação", "Horror", "Seinen"],
    year: 2022,
    studio: "MAPPA",
    duration: "24min/ep",
  },
  {
    id: "demon-slayer-hashira",
    title: "Demon Slayer: Hashira Training",
    japaneseTitle: "鬼滅の刃 柱稽古編",
    image: "https://cdn.myanimelist.net/images/anime/1565/142733.jpg",
    bannerImage: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=85",
    score: 8.2,
    episodes: 8,
    status: "Completed",
    synopsis: "Com a batalha final contra Muzan se aproximando, Tanjiro e os outros caçadores de demônios passam por um treinamento intensivo com os Hashira. Cada pilar testa seus limites enquanto se preparam para o confronto decisivo.",
    genres: ["Ação", "Fantasia", "Shounen"],
    year: 2024,
    studio: "ufotable",
    duration: "25min/ep",
  },
  {
    id: "blue-lock",
    title: "Blue Lock",
    japaneseTitle: "ブルーロック",
    image: "https://cdn.myanimelist.net/images/anime/1258/126929.jpg",
    bannerImage: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=85",
    score: 8.1,
    episodes: 24,
    status: "Airing",
    synopsis: "Após o fracasso do Japão na Copa do Mundo, um programa radical é criado para encontrar o atacante mais egoísta do país. 300 jovens jogadores são confinados em Blue Lock, onde apenas um emergirá como o goleador definitivo.",
    genres: ["Esportes", "Drama", "Shounen"],
    year: 2022,
    studio: "8bit",
    duration: "24min/ep",
  },
  {
    id: "spy-x-family-s2",
    title: "SPY x FAMILY Season 2",
    japaneseTitle: "SPY×FAMILY Season 2",
    image: "https://cdn.myanimelist.net/images/anime/1506/138982.jpg",
    bannerImage: "https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=85",
    score: 8.5,
    episodes: 12,
    status: "Completed",
    synopsis: "A família Forger continua sua vida dupla enquanto Loid mantém sua missão secreta, Yor esconde seu trabalho como assassina, e a telepata Anya tenta manter a paz. Novas missões e desafios escolares os aguardam.",
    genres: ["Ação", "Comédia", "Slice of Life"],
    year: 2023,
    studio: "Wit Studio / CloverWorks",
    duration: "24min/ep",
  },
  {
    id: "oshi-no-ko",
    title: "Oshi no Ko",
    japaneseTitle: "【推しの子】",
    image: "https://cdn.myanimelist.net/images/anime/1812/134736.jpg",
    bannerImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1920&q=85",
    score: 8.9,
    episodes: 11,
    status: "Completed",
    synopsis: "Um médico obstetra e sua paciente favorita, a idol Ai, renascem como seus filhos gêmeos. Anos depois, os irmãos navegam pelo obscuro mundo do entretenimento japonês enquanto buscam a verdade sobre a morte de sua mãe.",
    genres: ["Drama", "Sobrenatural", "Seinen"],
    year: 2023,
    studio: "Doga Kobo",
    duration: "24min/ep",
  },
  {
    id: "dandadan",
    title: "Dandadan",
    japaneseTitle: "ダンダダン",
    image: "https://cdn.myanimelist.net/images/anime/1032/142086.jpg",
    bannerImage: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=85",
    score: 8.7,
    episodes: 12,
    status: "Airing",
    synopsis: "Momo, que acredita em fantasmas, e Okarun, obcecado por alienígenas, fazem uma aposta para provar quem está certo. Quando ambos descobrem que estão certos, eles se unem para enfrentar ameaças sobrenaturais e extraterrestres.",
    genres: ["Ação", "Comédia", "Sobrenatural"],
    year: 2024,
    studio: "Science SARU",
    duration: "24min/ep",
  },
  {
    id: "mushoku-tensei-s2",
    title: "Mushoku Tensei II",
    japaneseTitle: "無職転生 II ～異世界行ったら本気だす～",
    image: "https://cdn.myanimelist.net/images/anime/1448/139357.jpg",
    bannerImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=85",
    score: 8.4,
    episodes: 25,
    status: "Completed",
    synopsis: "Rudeus continua sua jornada no novo mundo, enfrentando novos desafios enquanto busca reunir sua família dispersa. Na academia de magia, ele conhece aliados e inimigos que moldarão seu destino.",
    genres: ["Aventura", "Drama", "Fantasia"],
    year: 2023,
    studio: "Studio Bind",
    duration: "24min/ep",
  },
  {
    id: "hell-paradise",
    title: "Hell's Paradise",
    japaneseTitle: "地獄楽",
    image: "https://cdn.myanimelist.net/images/anime/1695/134552.jpg",
    bannerImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&q=85",
    score: 8.0,
    episodes: 13,
    status: "Completed",
    synopsis: "O lendário assassino Gabimaru é capturado e condenado à morte. Para obter seu perdão, ele deve viajar para uma ilha misteriosa em busca do Elixir da Imortalidade, enfrentando criaturas e ninjas rivais.",
    genres: ["Ação", "Aventura", "Sobrenatural"],
    year: 2023,
    studio: "MAPPA",
    duration: "24min/ep",
  },
]

// Featured anime for the hero banner - rotates based on popularity/recency
export const featuredAnime: AnimeData = trendingAnimeList[0]

// Continue watching data - simulates user's watch history
export const continueWatchingList = [
  { 
    id: "cw-solo-leveling", 
    title: "Solo Leveling", 
    episode: 8, 
    progress: 65, 
    image: "https://cdn.myanimelist.net/images/anime/1908/141597.jpg",
    nextEpisodeTitle: "A Arte do Monarca das Sombras"
  },
  { 
    id: "cw-frieren", 
    title: "Frieren", 
    episode: 15, 
    progress: 30, 
    image: "https://cdn.myanimelist.net/images/anime/1015/138006.jpg",
    nextEpisodeTitle: "Memórias de Himmel"
  },
  { 
    id: "cw-jjk", 
    title: "Jujutsu Kaisen S2", 
    episode: 18, 
    progress: 80, 
    image: "https://cdn.myanimelist.net/images/anime/1792/138022.jpg",
    nextEpisodeTitle: "Incidente de Shibuya - Parte 35"
  },
  { 
    id: "cw-kaiju", 
    title: "Kaiju No. 8", 
    episode: 5, 
    progress: 45, 
    image: "https://cdn.myanimelist.net/images/anime/1032/142086.jpg",
    nextEpisodeTitle: "O Despertar de Kafka"
  },
]

// Stats data for the dashboard
export const userStats = {
  animesAssistidos: 127,
  episodiosAssistidos: 2847,
  horasAssistidas: 1138,
  animesNaLista: 45,
  mediaNotas: 8.2,
  generoFavorito: "Ação",
}

// Simulated API delay helper
export function simulateApiDelay<T>(data: T, delayMs: number = 800): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delayMs)
  })
}

// Fetch functions that simulate API calls
export async function fetchFeaturedAnime(): Promise<AnimeData> {
  return simulateApiDelay(featuredAnime, 600)
}

export async function fetchTrendingAnimes(): Promise<AnimeData[]> {
  return simulateApiDelay(trendingAnimeList, 1000)
}

export async function fetchContinueWatching(): Promise<typeof continueWatchingList> {
  return simulateApiDelay(continueWatchingList, 400)
}

export async function fetchAnimeById(id: string): Promise<AnimeData | undefined> {
  const anime = trendingAnimeList.find(a => a.id === id)
  return simulateApiDelay(anime, 300)
}

export async function searchAnimes(query: string): Promise<AnimeData[]> {
  const results = trendingAnimeList.filter(anime => 
    anime.title.toLowerCase().includes(query.toLowerCase()) ||
    anime.japaneseTitle?.toLowerCase().includes(query.toLowerCase()) ||
    anime.genres?.some(g => g.toLowerCase().includes(query.toLowerCase()))
  )
  return simulateApiDelay(results, 500)
}
