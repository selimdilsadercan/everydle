import { redirect } from 'next/navigation'

export default function HomePage() {
  // Server-side redirect is better for SEO than client-side useEffect redirect
  redirect('/challenge')
  
  // This part will never be reached, but good to have for bots if they don't follow redirect
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Everydle</h1>
        <p className="text-slate-400 mb-8">Türkiye'nin günlük kelime ve bulmaca oyunları koleksiyonu.</p>
        <a 
          href="/challenge" 
          className="bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold"
        >
          Hemen Oyna
        </a>
      </div>
    </div>
  )
}
