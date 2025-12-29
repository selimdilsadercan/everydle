import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Redactle Türkçe',
  description: 'Gizlenmiş bir Wikipedia makalesini kelimeleri tahmin ederek ortaya çıkar. En zorlu kelime avı!',
  keywords: ['Redactle Türkçe', 'Makale Tahmin Etme', 'Kelime Avı', 'Bulmaca'],
  openGraph: {
    title: 'Redactle Türkçe | Everydle',
    description: 'Gizli makaleyi bulabilecek misin? Hemen oyna!',
    images: ['/og-image.png'],
  }
}

export default function RedactleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
