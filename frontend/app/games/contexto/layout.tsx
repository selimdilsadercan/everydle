import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contexto Türkçe',
  description: 'Gizli kelimeyi anlam benzerliğine göre bul. Yapay zeka kelimenin gizli kelimeye ne kadar yakın olduğunu söyler.',
  keywords: ['Contexto Türkçe', 'Anlam Benzerliği', 'Kelime Oyunu', 'Bulmaca'],
  openGraph: {
    title: 'Contexto Türkçe | Everydle',
    description: 'Anlam benzerliğinden kelimeyi bul. Hemen oyna!',
    images: ['/og-image.png'],
  }
}

export default function ContextoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
