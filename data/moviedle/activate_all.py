"""
Tüm pasif filmleri aktif hale getir.
"""

import json
from pathlib import Path

POOL_FILE = Path(__file__).parent / "movies_pool.json"

def activate_all_movies():
    print("🔄 Tüm filmleri aktif hale getiriliyor...")
    
    # Pool'u yükle
    with open(POOL_FILE, "r", encoding="utf-8") as f:
        pool = json.load(f)
    
    movies = pool.get("movies", [])
    activated_count = 0
    
    for movie in movies:
        if not movie.get("isActive", True):
            movie["isActive"] = True
            activated_count += 1
    
    # İstatistikleri güncelle
    pool["active_count"] = len(movies)
    pool["inactive_count"] = 0
    
    # Kaydet
    with open(POOL_FILE, "w", encoding="utf-8") as f:
        json.dump(pool, f, ensure_ascii=False, indent=2)
    
    print(f"✅ {activated_count} film aktif hale getirildi!")
    print(f"📦 Toplam: {len(movies)} film")

if __name__ == "__main__":
    activate_all_movies()
