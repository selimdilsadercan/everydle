"""
Octordle için Günlük Kelime Seçici

Bu script, Octordle oyunu için 100 günlük kelime seti seçer.
Her gün 8 kelime seçilir.
Kurallar:
- Aynı gün içinde aynı kelime olamaz
- Seçilen kelime son 20 gün içinde kullanılmış olamaz
- 23.11.2025'ten başlayarak tarihleri atar
"""

import random
import json
from datetime import datetime, timedelta
from pathlib import Path

# Dosya yolları
SCRIPT_DIR = Path(__file__).parent
WORDS_FILE = SCRIPT_DIR / "words_wordle_5letters_filtered.txt"
OUTPUT_FILE = SCRIPT_DIR / "daily_octordle.json"

# Ayarlar
START_DATE = datetime(2025, 11, 23)  # Başlangıç tarihi
DAYS_COUNT = 100  # Kaç günlük kelime seçilecek
WORDS_PER_DAY = 8  # Her gün kaç kelime (Octordle = 8)
COOLDOWN_DAYS = 20  # Bir kelime tekrar seçilebilmesi için geçmesi gereken gün


def load_words() -> list:
    """Kelime listesini yükle."""
    with open(WORDS_FILE, "r", encoding="utf-8") as f:
        words = [line.strip() for line in f if line.strip()]
    return words


def select_words_for_day(available_words: list, count: int) -> list:
    """Bir gün için rastgele kelime seç (tekrar olmadan)."""
    if len(available_words) < count:
        raise ValueError(f"Yeterli kelime yok! İstenen: {count}, Mevcut: {len(available_words)}")
    return random.sample(available_words, count)


def get_available_words(all_words: list, recent_words: list) -> list:
    """Son 20 günde kullanılmamış kelimeleri döndür."""
    recent_set = set(recent_words)
    return [w for w in all_words if w not in recent_set]


def main():
    print("=" * 60)
    print("🔤 OCTORDLE GÜNLÜK KELİME SEÇİCİ")
    print("=" * 60)
    
    # Kelimeleri yükle
    all_words = load_words()
    print(f"\n📂 Toplam kelime: {len(all_words)}")
    print(f"📊 Günlük kelime: {WORDS_PER_DAY}")
    print(f"⏳ Bekleme süresi: {COOLDOWN_DAYS} gün")
    
    # Tarihli liste oluştur
    daily_octordle = []
    recent_words = []  # Son COOLDOWN_DAYS * WORDS_PER_DAY kelime
    
    print(f"\n📅 Başlangıç: {START_DATE.strftime('%d.%m.%Y')}")
    end_date = START_DATE + timedelta(days=DAYS_COUNT - 1)
    print(f"📅 Bitiş: {end_date.strftime('%d.%m.%Y')}")
    
    print("\n📌 Kelimeler:")
    print("-" * 80)
    
    for i in range(DAYS_COUNT):
        date = START_DATE + timedelta(days=i)
        date_str = date.strftime("%d.%m.%Y")
        
        # Son 20 günde kullanılmamış kelimeleri al
        available = get_available_words(all_words, recent_words)
        
        if len(available) < WORDS_PER_DAY:
            print(f"⚠️ Uyarı: Gün {i+1} için yeterli kelime kalmadı!")
            # En eski kelimeleri serbest bırak
            recent_words = recent_words[WORDS_PER_DAY:]
            available = get_available_words(all_words, recent_words)
        
        # Günlük 8 kelime seç
        day_words = select_words_for_day(available, WORDS_PER_DAY)
        
        # Seçilen kelimeleri recent listesine ekle
        recent_words.extend(day_words)
        
        # Cooldown süresi geçen kelimeleri çıkar
        max_recent = COOLDOWN_DAYS * WORDS_PER_DAY
        if len(recent_words) > max_recent:
            recent_words = recent_words[-max_recent:]
        
        daily_octordle.append({
            "date": date_str,
            "words": day_words
        })
        
        words_display = " | ".join([w.upper() for w in day_words])
        print(f"   {i+1:3}. {date_str} | {words_display}")
    
    # JSON dosyasına kaydet
    output_data = {
        "generated_at": datetime.now().isoformat(),
        "start_date": START_DATE.strftime("%d.%m.%Y"),
        "end_date": end_date.strftime("%d.%m.%Y"),
        "total_days": len(daily_octordle),
        "words_per_day": WORDS_PER_DAY,
        "cooldown_days": COOLDOWN_DAYS,
        "daily_octordle": daily_octordle
    }
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 '{OUTPUT_FILE}' dosyasına kaydedildi.")
    
    # İstatistikler
    total_words_used = DAYS_COUNT * WORDS_PER_DAY
    print(f"\n📈 İstatistikler:")
    print(f"   Toplam kullanılan kelime: {total_words_used}")
    print(f"   Mevcut kelime havuzu: {len(all_words)}")
    
    return daily_octordle


if __name__ == "__main__":
    octordle = main()
