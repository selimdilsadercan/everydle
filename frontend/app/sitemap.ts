import { MetadataRoute } from 'next'
import gamesData from '@/data/games.json'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://playeverydle.com'
  const games = Object.keys(gamesData.games)

  const gameUrls = games.map((gameId) => ({
    url: `${baseUrl}/games/${gameId}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/games`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/challenge`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/store`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/levels`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ]

  return [...staticUrls, ...gameUrls]
}
