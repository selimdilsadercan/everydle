"""
TMDB API'den Moviedle için film havuzu toplama scripti.
Incremental Sync: Mevcut pool'u günceller, yeni filmleri ekler,
artık kriterlere uymayan filmleri isActive: false işaretler.

Filtreler:
- adult = false
- release_date: 1970 - 2026
- Global filmler: vote_count >= 1000
- Türkçe filmler: vote_count >= 100
- popularity >= 5

Yıl dilimleri halinde discover endpoint kullanılıyor.
Hedef: 2000-5000 film
"""

import requests
import json
import time
from datetime import datetime
from pathlib import Path

# TMDB API Ayarları
API_KEY = "cb4898718f8913cfdfa5d7ca0f99344e"
BASE_URL = "https://api.themoviedb.org/3"

# Filtreler
MIN_VOTE_COUNT_GLOBAL = 1000  # Global filmler için
MIN_VOTE_COUNT_TR = 10       # Türkçe filmler için
MIN_POPULARITY = 0
START_YEAR = 1970
END_YEAR = 2026

# Rate limiting için bekleme süresi (saniye)
REQUEST_DELAY = 0.25

# Dosya yolları
OUTPUT_DIR = Path(__file__).parent
POOL_FILE = OUTPUT_DIR / "movies_pool.json"


def load_existing_pool() -> dict:
    """Mevcut pool'u yükle."""
    if POOL_FILE.exists():
        with open(POOL_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            print(f"📂 Mevcut pool yüklendi: {data.get('total_count', 0)} film")
            return data
    return {"movies": [], "total_count": 0}


def get_existing_movie_ids(pool_data: dict) -> set:
    """Mevcut pool'daki film ID'lerini al."""
    return {movie["id"] for movie in pool_data.get("movies", [])}


def fetch_movie_ids_by_year_range(
    start_year: int, 
    end_year: int, 
    min_vote_count: int,
    language_filter: str = None,
    page: int = 1
) -> dict:
    """Belirli yıl aralığındaki film ID'lerini çeker."""
    
    url = f"{BASE_URL}/discover/movie"
    params = {
        "api_key": API_KEY,
        "language": "tr-TR",
        "sort_by": "vote_count.desc",
        "include_adult": "false",
        "include_video": "false",
        "page": page,
        "primary_release_date.gte": f"{start_year}-01-01",
        "primary_release_date.lte": f"{end_year}-12-31",
        "vote_count.gte": min_vote_count,
    }
    
    if language_filter:
        params["with_original_language"] = language_filter
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


def fetch_all_movie_ids_for_range(
    start_year: int, 
    end_year: int,
    min_vote_count: int,
    language_filter: str = None
) -> list:
    """Bir yıl aralığı için tüm filmleri çeker."""
    
    all_movies = []
    page = 1
    
    # İlk sayfa
    data = fetch_movie_ids_by_year_range(start_year, end_year, min_vote_count, language_filter, page)
    total_pages = min(data.get("total_pages", 1), 500)
    total_results = data.get("total_results", 0)
    
    lang_info = f" ({language_filter})" if language_filter else ""
    print(f"  📅 {start_year}-{end_year}{lang_info}: {total_results} film bulundu ({total_pages} sayfa)")
    
    all_movies.extend(data.get("results", []))
    
    # Kalan sayfalar
    for page in range(2, total_pages + 1):
        time.sleep(REQUEST_DELAY)
        try:
            data = fetch_movie_ids_by_year_range(start_year, end_year, min_vote_count, language_filter, page)
            all_movies.extend(data.get("results", []))
            
            if page % 10 == 0:
                print(f"    Sayfa {page}/{total_pages} tamamlandı...")
                
        except Exception as e:
            print(f"    ⚠️ Sayfa {page} hatası: {e}")
            continue
    
    return all_movies


def process_movie(movie: dict) -> dict:
    """Film verisini sadeleştir."""
    
    # Popularity filtresi
    if movie.get("popularity", 0) < MIN_POPULARITY:
        return None
    
    return {
        "id": movie.get("id"),
        "title": movie.get("title"),
        "original_title": movie.get("original_title"),
        "release_date": movie.get("release_date"),
        "year": int(movie.get("release_date", "0000")[:4]) if movie.get("release_date") else None,
        "vote_average": movie.get("vote_average"),
        "vote_count": movie.get("vote_count"),
        "popularity": movie.get("popularity"),
        "poster_path": movie.get("poster_path"),
        "backdrop_path": movie.get("backdrop_path"),
        "overview": movie.get("overview"),
        "original_language": movie.get("original_language"),
        "genre_ids": movie.get("genre_ids", []),
        "isActive": True,
        "addedAt": datetime.now().isoformat(),
        "lastSyncAt": datetime.now().isoformat(),
    }


def sync_movies():
    """Film havuzunu senkronize et."""
    
    print("🎬 TMDB Moviedle Film Havuzu Senkronizasyonu")
    print("=" * 60)
    
    # Mevcut pool'u yükle
    existing_pool = load_existing_pool()
    existing_ids = get_existing_movie_ids(existing_pool)
    existing_movies_map = {m["id"]: m for m in existing_pool.get("movies", [])}
    
    print(f"📊 Mevcut pool'da {len(existing_ids)} film var")
    
    # Yıl dilimleri
    year_ranges = [
        (1970, 1979),
        (1980, 1989),
        (1990, 1999),
        (2000, 2009),
        (2010, 2019),
        (2020, 2026),
    ]
    
    # Yeni fetch edilen tüm film ID'leri
    all_fetched_ids = set()
    new_movies = []
    
    # 1. Global filmler (vote_count >= 1000)
    print("\n🌍 Global filmler taranıyor (vote_count >= 1000)...")
    for start_year, end_year in year_ranges:
        print(f"\n🔍 {start_year}-{end_year} dönemi...")
        
        movies = fetch_all_movie_ids_for_range(start_year, end_year, MIN_VOTE_COUNT_GLOBAL)
        
        for movie in movies:
            movie_id = movie.get("id")
            all_fetched_ids.add(movie_id)
            
            # Yeni film mi?
            if movie_id not in existing_ids:
                processed = process_movie(movie)
                if processed:
                    new_movies.append(processed)
        
        time.sleep(0.5)
    
    # 2. Türkçe filmler (vote_count >= 100)
    print("\n\n🇹🇷 Türkçe filmler taranıyor (vote_count >= 100)...")
    for start_year, end_year in year_ranges:
        print(f"\n🔍 {start_year}-{end_year} dönemi...")
        
        movies = fetch_all_movie_ids_for_range(start_year, end_year, MIN_VOTE_COUNT_TR, "tr")
        
        for movie in movies:
            movie_id = movie.get("id")
            all_fetched_ids.add(movie_id)
            
            # Yeni film mi?
            if movie_id not in existing_ids:
                processed = process_movie(movie)
                if processed:
                    new_movies.append(processed)
        
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    
    # 3. Mevcut filmleri güncelle
    updated_movies = []
    deactivated_count = 0
    reactivated_count = 0
    
    for movie_id, movie in existing_movies_map.items():
        movie["lastSyncAt"] = datetime.now().isoformat()
        
        if movie_id in all_fetched_ids:
            # Film hala kriterlere uyuyor
            if not movie.get("isActive", True):
                movie["isActive"] = True
                reactivated_count += 1
        else:
            # Film artık kriterlere uymuyor
            if movie.get("isActive", True):
                movie["isActive"] = False
                deactivated_count += 1
        
        updated_movies.append(movie)
    
    # 4. Yeni filmleri ekle
    all_movies = updated_movies + new_movies
    
    # Duplicate kontrolü (güvenlik için)
    seen_ids = set()
    unique_movies = []
    for movie in all_movies:
        if movie["id"] not in seen_ids:
            unique_movies.append(movie)
            seen_ids.add(movie["id"])
    
    # Popularity'ye göre sırala
    unique_movies.sort(key=lambda x: x.get("popularity", 0), reverse=True)
    
    # İstatistikler
    active_count = sum(1 for m in unique_movies if m.get("isActive", True))
    inactive_count = len(unique_movies) - active_count
    
    print(f"\n📊 Senkronizasyon Sonuçları:")
    print(f"  ➕ Yeni eklenen: {len(new_movies)} film")
    print(f"  🔄 Deaktif edilen: {deactivated_count} film")
    print(f"  ✅ Reaktif edilen: {reactivated_count} film")
    print(f"  📦 Toplam: {len(unique_movies)} film")
    print(f"  ✅ Aktif: {active_count} film")
    print(f"  ⏸️ Pasif: {inactive_count} film")
    
    # JSON dosyasına kaydet
    with open(POOL_FILE, "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": existing_pool.get("generated_at", datetime.now().isoformat()),
            "last_sync_at": datetime.now().isoformat(),
            "total_count": len(unique_movies),
            "active_count": active_count,
            "inactive_count": inactive_count,
            "filters": {
                "min_vote_count_global": MIN_VOTE_COUNT_GLOBAL,
                "min_vote_count_tr": MIN_VOTE_COUNT_TR,
                "min_popularity": MIN_POPULARITY,
                "year_range": f"{START_YEAR}-{END_YEAR}",
                "adult": False,
            },
            "movies": unique_movies,
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Kaydedildi: {POOL_FILE}")
    
    # Detaylı istatistikler
    print("\n📈 İstatistikler:")
    
    # Yıllara göre dağılım (sadece aktif filmler)
    year_counts = {}
    for movie in unique_movies:
        if movie.get("isActive", True):
            year = movie.get("year")
            if year:
                decade = (year // 10) * 10
                year_counts[decade] = year_counts.get(decade, 0) + 1
    
    for decade in sorted(year_counts.keys()):
        print(f"  {decade}s: {year_counts[decade]} aktif film")
    
    # Dil dağılımı (sadece aktif filmler)
    lang_counts = {}
    for movie in unique_movies:
        if movie.get("isActive", True):
            lang = movie.get("original_language", "unknown")
            lang_counts[lang] = lang_counts.get(lang, 0) + 1
    
    print("\n🌍 Dil Dağılımı (Top 10, aktif filmler):")
    for lang, count in sorted(lang_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"  {lang}: {count} film")


if __name__ == "__main__":
    sync_movies()
