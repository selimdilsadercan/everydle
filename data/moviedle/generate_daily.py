"""
Moviedle için 30 günlük film seçici.
Pool'dan rastgele ama "genel bilindik" filmler seçer.
En popüler değil, orta seviye popülerlik aralığından seçim yapar.
"""

import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# Dosya yolları
SCRIPT_DIR = Path(__file__).parent
POOL_FILE = SCRIPT_DIR / "movies_pool.json"
OUTPUT_FILE = SCRIPT_DIR / "daily_movies.json"

# Ayarlar
START_DATE = datetime(2025, 12, 18)  # Başlangıç tarihi
DAYS_COUNT = 30  # Kaç günlük film seçilecek

# Popülerlik aralığı (en ünlüler değil, orta seviye)
# Percentile: 0.15 = üst %15'i hariç tut, 0.85 = alt %15'i hariç tut
POPULARITY_PERCENTILE_MIN = 0.00  # En popüler %10'u hariç tut
POPULARITY_PERCENTILE_MAX = 0.05  # Alt %30'u hariç tut

# Dil dağılımı (her 30 günde kaç tane)
TR_MOVIE_COUNT = 6   # Türkçe film
EN_MOVIE_COUNT = 24  # İngilizce/diğer film

# Minimum IMDB puanı
MIN_VOTE_AVERAGE = 6.0


def load_pool():
    """Film havuzunu yükle."""
    with open(POOL_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def filter_active_movies(movies: list) -> list:
    """Sadece aktif filmleri filtrele."""
    return [m for m in movies if m.get("isActive", True)]


def filter_movies_with_poster(movies: list) -> list:
    """Posteri olan filmleri filtrele (Moviedle için gerekli)."""
    return [m for m in movies if m.get("poster_path")]


def filter_movies_by_rating(movies: list, min_rating: float) -> list:
    """Minimum IMDB puanına sahip filmleri filtrele."""
    return [m for m in movies if m.get("vote_average", 0) >= min_rating]


def get_movies_by_language(movies: list, language: str) -> list:
    """Belirli dildeki filmleri getir."""
    return [m for m in movies if m.get("original_language") == language]


def get_medium_popularity_movies(movies: list, min_percentile: float, max_percentile: float) -> list:
    """Orta popülerlik aralığındaki filmleri getir."""
    if not movies:
        return []
    
    # Popülerliğe göre sırala
    sorted_movies = sorted(movies, key=lambda x: x.get("popularity", 0), reverse=True)
    
    total = len(sorted_movies)
    start_idx = int(total * min_percentile)
    end_idx = int(total * max_percentile)
    
    # En az bir miktar film al
    if end_idx - start_idx < 10:
        start_idx = 0
        end_idx = total
    
    return sorted_movies[start_idx:end_idx]


def select_random_movies(movies: list, count: int) -> list:
    """Rastgele film seç (tekrar olmadan)."""
    if len(movies) <= count:
        return movies
    return random.sample(movies, count)


def generate_daily_movies():
    """30 günlük film listesi oluştur."""
    
    print("🎬 Moviedle 30 Günlük Film Seçici")
    print("=" * 50)
    
    # Pool'u yükle
    pool = load_pool()
    all_movies = pool.get("movies", [])
    
    print(f"📂 Toplam film: {len(all_movies)}")
    
    # Aktif ve posterli filmleri filtrele
    active_movies = filter_active_movies(all_movies)
    movies_with_poster = filter_movies_with_poster(active_movies)
    quality_movies = filter_movies_by_rating(movies_with_poster, MIN_VOTE_AVERAGE)
    
    print(f"✅ Aktif film: {len(active_movies)}")
    print(f"🖼️ Posterli film: {len(movies_with_poster)}")
    print(f"⭐ IMDB >= {MIN_VOTE_AVERAGE}: {len(quality_movies)} film")
    
    # Dil bazlı ayır
    tr_movies = get_movies_by_language(quality_movies, "tr")
    en_movies = get_movies_by_language(quality_movies, "en")
    
    print(f"\n🇹🇷 Türkçe film: {len(tr_movies)}")
    print(f"🇺🇸 İngilizce film: {len(en_movies)}")
    
    # Orta popülerlik aralığından seç
    tr_medium = get_medium_popularity_movies(tr_movies, POPULARITY_PERCENTILE_MIN, POPULARITY_PERCENTILE_MAX)
    en_medium = get_medium_popularity_movies(en_movies, POPULARITY_PERCENTILE_MIN, POPULARITY_PERCENTILE_MAX)
    
    print(f"\n📊 Orta popülerlik aralığı:")
    print(f"  🇹🇷 Türkçe: {len(tr_medium)} film")
    print(f"  🇺🇸 İngilizce: {len(en_medium)} film")
    
    # Rastgele seç
    selected_tr = select_random_movies(tr_medium, TR_MOVIE_COUNT)
    selected_en = select_random_movies(en_medium, EN_MOVIE_COUNT)
    
    # Birleştir ve karıştır
    all_selected = selected_tr + selected_en
    random.shuffle(all_selected)
    
    print(f"\n🎲 Seçilen filmler: {len(all_selected)}")
    
    # Günlük listesini oluştur
    daily_list = []
    
    for i, movie in enumerate(all_selected):
        date = START_DATE + timedelta(days=i)
        
        daily_entry = {
            "date": date.strftime("%Y-%m-%d"),
            "day": i + 1,
            "movie": {
                "id": movie.get("id"),
                "title": movie.get("title"),
                "original_title": movie.get("original_title"),
                "year": movie.get("year"),
                "poster_path": movie.get("poster_path"),
                "backdrop_path": movie.get("backdrop_path"),
                "vote_average": movie.get("vote_average"),
                "vote_count": movie.get("vote_count"),
                "popularity": movie.get("popularity"),
                "original_language": movie.get("original_language"),
                "overview": movie.get("overview"),
                "genre_ids": movie.get("genre_ids", []),
                "cast": movie.get("cast", []),
            }
        }
        daily_list.append(daily_entry)
    
    # JSON dosyasına kaydet
    output_data = {
        "generated_at": datetime.now().isoformat(),
        "start_date": START_DATE.strftime("%Y-%m-%d"),
        "end_date": (START_DATE + timedelta(days=DAYS_COUNT - 1)).strftime("%Y-%m-%d"),
        "total_days": len(daily_list),
        "settings": {
            "popularity_percentile_min": POPULARITY_PERCENTILE_MIN,
            "popularity_percentile_max": POPULARITY_PERCENTILE_MAX,
            "tr_movie_count": TR_MOVIE_COUNT,
            "en_movie_count": EN_MOVIE_COUNT,
        },
        "daily_movies": daily_list,
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Kaydedildi: {OUTPUT_FILE}")
    
    # Seçilen filmleri listele
    print("\n" + "=" * 50)
    print("📅 Seçilen Filmler:")
    print("-" * 50)
    
    for entry in daily_list:
        movie = entry["movie"]
        lang_flag = "🇹🇷" if movie["original_language"] == "tr" else "🇺🇸"
        print(f"{entry['date']} | {lang_flag} {movie['title']} ({movie['year']}) - ⭐{movie['vote_average']:.1f}")


if __name__ == "__main__":
    generate_daily_movies()
