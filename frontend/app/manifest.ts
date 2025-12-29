import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Everydle - Günlük Kelime Oyunları Koleksiyonu',
    short_name: 'Everydle',
    description: 'Wordle, Contexto, Redactle ve daha fazlası.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0F172B',
    theme_color: '#0F172B',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
