import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Wordle Türkçe',
  description: 'Günün kelimesini 6 tahminde bulmaya çalış. Her gün yeni bir kelime Everydle\'da!',
  keywords: ['Wordle Türkçe', 'Kelime Oyunu', 'Günlük Bulmaca', 'Wordle Oyna'],
  openGraph: {
    title: 'Wordle Türkçe | Everydle',
    description: 'Günün kelimesini bulabilecek misin? Hemen oyna!',
    images: ['/og-image.png'],
  }
}

export default function WordleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
