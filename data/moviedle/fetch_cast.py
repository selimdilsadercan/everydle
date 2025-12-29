"""
TMDB API'den movies_pool.json içindeki filmlerin oyuncu bilgilerini çeker.
Her film için cast (oyuncu) verilerini alıp movies_pool.json'a ekler.

Kullanım:
    python fetch_cast.py

Çıktı:
    - Her filme "cast" array'i eklenir
    - Her oyuncu için: id, name, character, profile_path
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime

# TMDB API Ayarları
API_KEY = "cb4898718f8913cfdfa5d7ca0f99344e"
BASE_URL = "https://api.themoviedb.org/3"

# Rate limiting için bekleme süresi (saniye)
REQUEST_DELAY = 0.25

# Kaç oyuncu alınacak (en önemli oyuncular)
MAX_CAST_PER_MOVIE = 10

# Dosya yolları
OUTPUT_DIR = Path(__file__).parent
POOL_FILE = OUTPUT_DIR / "movies_pool.json"


def load_pool() -> dict:
    """Pool dosyasını yükle."""
    if POOL_FILE.exists():
        with open(POOL_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    raise FileNotFoundError(f"Pool dosyası bulunamadı: {POOL_FILE}")


def save_pool(data: dict):
    """Pool dosyasını kaydet."""
    with open(POOL_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def fetch_movie_credits(movie_id: int) -> dict:
    """Bir filmin oyuncu bilgilerini çeker."""
    url = f"{BASE_URL}/movie/{movie_id}/credits"
    params = {
        "api_key": API_KEY,
        "language": "tr-TR"
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def process_cast(credits_data: dict) -> list:
    """Oyuncu verilerini sadeleştir."""
    cast = credits_data.get("cast", [])
    
    processed = []
    for actor in cast[:MAX_CAST_PER_MOVIE]:
        processed.append({
            "id": actor.get("id"),
            "name": actor.get("name"),
            "character": actor.get("character"),
            "profile_path": actor.get("profile_path"),
            "order": actor.get("order", 0)
        })
    
    return processed


def fetch_all_cast():
    """Tüm filmler için oyuncu bilgilerini çeker."""
    
    print("🎬 TMDB Film Oyuncu Bilgileri Çekme")
    print("=" * 60)
    
    # Pool'u yükle
    pool_data = load_pool()
    movies = pool_data.get("movies", [])
    total_movies = len(movies)
    
    print(f"📂 Pool yüklendi: {total_movies} film")
    
    # Kaç film zaten cast bilgisine sahip?
    movies_with_cast = sum(1 for m in movies if m.get("cast"))
    movies_without_cast = total_movies - movies_with_cast
    
    print(f"✅ Cast bilgisi olan: {movies_with_cast} film")
    print(f"⏳ Cast bilgisi eksik: {movies_without_cast} film")
    
    if movies_without_cast == 0:
        print("\n✨ Tüm filmlerde cast bilgisi mevcut!")
        return
    
    print(f"\n🔄 Cast bilgisi eksik filmler için veri çekiliyor...\n")
    
    updated_count = 0
    error_count = 0
    
    for i, movie in enumerate(movies):
        # Zaten cast bilgisi varsa atla
        if movie.get("cast"):
            continue
        
        movie_id = movie.get("id")
        movie_title = movie.get("title", "Bilinmeyen")
        
        try:
            # Cast bilgisini çek
            credits_data = fetch_movie_credits(movie_id)
            cast = process_cast(credits_data)
            
            # Filme ekle
            movie["cast"] = cast
            movie["castFetchedAt"] = datetime.now().isoformat()
            
            updated_count += 1
            
            # İlerleme raporu
            if updated_count % 50 == 0:
                print(f"  ✅ {updated_count}/{movies_without_cast} film güncellendi...")
            
            # Rate limiting
            time.sleep(REQUEST_DELAY)
            
        except Exception as e:
            error_count += 1
            print(f"  ⚠️ Hata ({movie_id} - {movie_title}): {e}")
            
            # Çok fazla hata varsa dur
            if error_count > 10:
                print("\n❌ Çok fazla hata! İşlem durduruluyor...")
                break
    
    print("\n" + "=" * 60)
    print(f"📊 Sonuçlar:")
    print(f"  ✅ Güncellenen: {updated_count} film")
    print(f"  ⚠️ Hata: {error_count} film")
    
    # Kaydet
    pool_data["lastCastSyncAt"] = datetime.now().isoformat()
    save_pool(pool_data)
    
    print(f"\n💾 Kaydedildi: {POOL_FILE}")
    
    # Örnek cast verisi göster
    sample_movie = next((m for m in movies if m.get("cast")), None)
    if sample_movie:
        print(f"\n📌 Örnek Cast Verisi ({sample_movie.get('title')}):")
        for actor in sample_movie.get("cast", [])[:3]:
            print(f"  • {actor.get('name')} - {actor.get('character')}")


if __name__ == "__main__":
    fetch_all_cast()
