import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Moviedle Türkçe',
  description: 'Günün filmini sahnelerinden tanı. Film severler için hazırlanan günlük bulmaca.',
  keywords: ['Moviedle Türkçe', 'Film Tahmin Etme', 'Sinema Bulmacası', 'Günün Filmi'],
  openGraph: {
    title: 'Moviedle Türkçe | Everydle',
    description: 'Sahnelerden filmi tanı. Hemen oyna!',
    images: ['/og-image.png'],
  }
}

export default function MoviedleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
