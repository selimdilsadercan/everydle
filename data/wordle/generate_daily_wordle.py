"""
Wordle için Günlük Kelime Seçici

Bu script, Wordle oyunu için 100 günlük kelime seçer.
Filtrelenmiş kelime listesinden rastgele seçim yapar.
23.11.2025'ten başlayarak tarihleri atar.
"""

import random
import json
from datetime import datetime, timedelta
from pathlib import Path

# Dosya yolları
SCRIPT_DIR = Path(__file__).parent
WORDS_FILE = SCRIPT_DIR / "words_wordle_5letters_filtered.txt"
OUTPUT_FILE = SCRIPT_DIR / "daily_wordle.json"

# Ayarlar
START_DATE = datetime(2025, 11, 23)  # Başlangıç tarihi
DAYS_COUNT = 100  # Kaç günlük kelime seçilecek


def load_words() -> list:
    """Kelime listesini yükle."""
    with open(WORDS_FILE, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]
    return words


def select_random_words(words: list, count: int) -> list:
    """Rastgele kelime seç (tekrar olmadan)."""
    if len(words) <= count:
        return words
    return random.sample(words, count)


def main():
    print("=" * 50)
    print("🔤 WORDLE GÜNLÜK KELİME SEÇİCİ")
    print("=" * 50)
    
    # Kelimeleri yükle
    all_words = load_words()
    print(f"\n📂 Toplam kelime: {len(all_words)}")
    
    # Rastgele seç
    selected_words = select_random_words(all_words, DAYS_COUNT)
    random.shuffle(selected_words)
    
    print(f"🎲 Seçilen kelime: {len(selected_words)}")
    
    # Tarihli liste oluştur
    daily_words = []
    
    print(f"\n📅 Başlangıç: {START_DATE.strftime('%d.%m.%Y')}")
    end_date = START_DATE + timedelta(days=DAYS_COUNT - 1)
    print(f"📅 Bitiş: {end_date.strftime('%d.%m.%Y')}")
    
    print("\n📌 Kelimeler:")
    print("-" * 40)
    
    for i, word in enumerate(selected_words):
        date = START_DATE + timedelta(days=i)
        date_str = date.strftime("%d.%m.%Y")
        
        daily_words.append({
            "date": date_str,
            "word": word
        })
        
        print(f"   {i+1:3}. {date_str} | {word.upper()}")
    
    # JSON dosyasına kaydet
    output_data = {
        "generated_at": datetime.now().isoformat(),
        "start_date": START_DATE.strftime("%d.%m.%Y"),
        "end_date": end_date.strftime("%d.%m.%Y"),
        "total_days": len(daily_words),
        "daily_words": daily_words
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 '{OUTPUT_FILE}' dosyasına kaydedildi.")
    
    return daily_words


if __name__ == "__main__":
    words = main()
