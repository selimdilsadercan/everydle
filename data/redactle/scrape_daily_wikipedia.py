"""
days.json dosyasındaki günleri sırayla işleyip Wikipedia sayfalarını scrape eder.
Mevcut scrape_wikipedia.py modülünü kullanır.
"""

import json
import os
import time
import sys
from scrape_wikipedia import scrape_wikipedia, extract_morphology_metadata
from zeyrek import MorphAnalyzer
from urllib.parse import unquote
import re


def load_days(json_path: str) -> list:
    """days.json dosyasını yükle"""
    with open(json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def create_safe_filename(title: str) -> str:
    """Türkçe karakterleri ASCII'ye çevirip güvenli dosya adı oluştur"""
    safe_title = title.replace('İ', 'I').replace('ı', 'i').replace('Ş', 'S').replace('ş', 's')
    safe_title = safe_title.replace('Ğ', 'G').replace('ğ', 'g').replace('Ü', 'U').replace('ü', 'u')
    safe_title = safe_title.replace('Ö', 'O').replace('ö', 'o').replace('Ç', 'C').replace('ç', 'c')
    safe_title = re.sub(r'[^\w\s-]', '', safe_title).strip()
    safe_title = re.sub(r'[-\s]+', '_', safe_title)
    return safe_title


def scrape_all_days(days: list, output_dir: str, delay: float = 1.5, start_from: int = 1):
    """
    Tüm günleri sırayla scrape et
    
    Args:
        days: days.json'dan yüklenen liste
        output_dir: Markdown dosyalarının kaydedileceği klasör
        delay: Her istek arasında beklenecek süre (saniye)
    """
    # Çıktı dizinini oluştur
    os.makedirs(output_dir, exist_ok=True)
    
    # Morfoloji analizörünü başlat
    print("Morfoloji analizörü başlatılıyor...")
    analyzer = MorphAnalyzer()
    
    total = len(days)
    success_count = 0
    error_count = 0
    
    print(f"\nToplam {total} gün, {start_from}'den başlanacak...")
    print("=" * 60)
    
    for i, day_data in enumerate(days, 1):
        # Belirtilen indexten öncekileri atla
        if i < start_from:
            continue
        day = day_data.get('day', '')
        word = day_data.get('word', '')
        wiki_url = day_data.get('wiki_url', '')
        
        print(f"\n[{i}/{total}] {day} - {word}")
        print(f"  URL: {wiki_url}")
        
        if not wiki_url:
            print("  ⚠️ URL bulunamadı, atlanıyor...")
            error_count += 1
            continue
        
        try:
            # Wikipedia sayfasını scrape et
            content = scrape_wikipedia(wiki_url)
            
            if content:
                # Morfoloji metadata'sını çıkar
                lemmas_metadata = extract_morphology_metadata(content, analyzer)
                metadata_json = json.dumps(lemmas_metadata, ensure_ascii=False, indent=2)
                
                # Dosya adı oluştur: 001-26.11.2025.md formatında
                md_filename = f"{i:03d}-{day}.md"
                filepath = os.path.join(output_dir, md_filename)
                
                # Markdown dosyasına kaydet
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                    f.write('\n\n---\n\n')
                    f.write('```json\n')
                    f.write('lemmas = ')
                    f.write(metadata_json)
                    f.write('\n```\n')
                
                print(f"  ✅ Kaydedildi: {md_filename}")
                print(f"     Karakter: {len(content)}, Kelime: {len(content.split())}, Kök: {len(lemmas_metadata)}")
                success_count += 1
            else:
                print("  ❌ İçerik alınamadı!")
                error_count += 1
                
        except Exception as e:
            print(f"  ❌ Hata: {str(e)}")
            error_count += 1
        
        # Rate limiting - Wikipedia'yı yormamak için
        if i < total:
            print(f"  ⏳ {delay} saniye bekleniyor...")
            time.sleep(delay)
    
    print("\n" + "=" * 60)
    print(f"TAMAMLANDI!")
    print(f"  ✅ Başarılı: {success_count}")
    print(f"  ❌ Hata: {error_count}")
    print(f"  📁 Çıktı klasörü: {output_dir}")


def main():
    # Mevcut dizin
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # days.json yolu
    days_json_path = os.path.join(script_dir, 'days.json')
    
    # Çıktı dizini
    output_dir = os.path.join(script_dir, 'data')
    
    # Günleri yükle
    print("days.json yükleniyor...")
    days = load_days(days_json_path)
    print(f"✅ {len(days)} gün yüklendi.")
    
    # Tüm günleri scrape et
    # 17'den devam et (ilk 16 zaten yapıldı)
    scrape_all_days(days, output_dir=output_dir, delay=1.5, start_from=17)


if __name__ == '__main__':
    main()
