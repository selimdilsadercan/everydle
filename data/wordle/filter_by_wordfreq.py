"""
Wordle kelimelerini wordfreq ile yaygınlık analizi yaparak filtreler.
Belirli bir yaygınlık eşiğinden yüksek olan kelimeleri tutar.
"""

import wordfreq
from wordfreq import word_frequency
import sys

IN_FILE = "./wordle/words_wordle_5letters.txt"
OUT_FILE = "./wordle/words_wordle_5letters_filtered.txt"
DEBUG_OUTPUT = "./wordle/words_wordle_5letters_freq_debug.txt"  # Tüm kelimeler ve frequency değerleri
MIN_FREQUENCY = 1.17e-05  # Minimum yaygınlık eşiği (varsayılan: 0.0000001)

def get_word_frequency(word, lang='tr'):
    """
    Kelimenin Türkçe'deki yaygınlığını döndürür.
    wordfreq, kelimelerin milyon kelime başına sıklığını verir.
    """
    try:
        freq = word_frequency(word, lang)
        return freq
    except:
        # Eğer kelime bulunamazsa veya hata olursa 0 döndür
        return 0.0

def main():
    # Komut satırından eşik değeri al (opsiyonel)
    min_freq = MIN_FREQUENCY
    if len(sys.argv) > 1:
        try:
            min_freq = float(sys.argv[1])
            print(f"Kullanıcı tanımlı eşik: {min_freq}")
        except ValueError:
            print(f"Geçersiz eşik değeri. Varsayılan kullanılıyor: {min_freq}")
    
    print(f"Minimum yaygınlık eşiği: {min_freq}")
    print(f"'{IN_FILE}' dosyası okunuyor...")
    
    # Kelimeleri yükle
    words = []
    with open(IN_FILE, "r", encoding="utf-8") as f:
        for line in f:
            word = line.strip().lower()
            if word and len(word) == 5:
                words.append(word)
    
    print(f"Toplam {len(words)} kelime yüklendi.")
    print("\nYaygınlık analizi yapılıyor...")
    
    # Her kelimenin yaygınlığını hesapla ve filtrele
    filtered_words = []
    word_freqs = []
    
    for i, word in enumerate(words):
        if (i + 1) % 500 == 0:
            print(f"  İşleniyor: {i + 1}/{len(words)}...")
        
        freq = get_word_frequency(word, 'tr')
        word_freqs.append((word, freq))
        
        if freq >= min_freq:
            filtered_words.append((word, freq))
    
    # Yaygınlığa göre sırala (en yaygın olanlar önce)
    filtered_words.sort(key=lambda x: x[1], reverse=True)
    
    # Sadece kelimeleri al
    filtered_words_only = [word for word, freq in filtered_words]
    
    print(f"\nSonuçlar:")
    print(f"  Toplam kelime: {len(words)}")
    print(f"  Eşik üzeri kelime: {len(filtered_words)}")
    print(f"  Elenen kelime: {len(words) - len(filtered_words)}")
    
    # İstatistikler
    if filtered_words:
        max_freq = filtered_words[0][1]
        min_freq_found = filtered_words[-1][1]
        print(f"\nYaygınlık istatistikleri:")
        print(f"  En yaygın kelime: '{filtered_words[0][0]}' (freq: {max_freq:.2e})")
        print(f"  En az yaygın kelime: '{filtered_words[-1][0]}' (freq: {min_freq_found:.2e})")
        
        # İlk 10 yaygın kelimeyi göster
        print(f"\nEn yaygın 10 kelime:")
        for i, (word, freq) in enumerate(filtered_words[:10], 1):
            print(f"  {i}. {word}: {freq:.2e}")
    
    # Filtrelenmiş kelimeleri dosyaya yaz
    print(f"\n'{OUT_FILE}' dosyasına yazılıyor...")
    with open(OUT_FILE, "w", encoding="utf-8") as out:
        for word in filtered_words_only:
            out.write(word + "\n")
    
    # Debug: Tüm kelimeleri ve frequency değerlerini yaz
    print(f"'{DEBUG_OUTPUT}' dosyasına tüm kelimeler ve frequency değerleri yazılıyor...")
    # Tüm kelimeleri frequency'ye göre sırala
    word_freqs_sorted = sorted(word_freqs, key=lambda x: x[1], reverse=True)
    
    # Aynı frequency değerine sahip kelimeleri analiz et
    freq_groups = {}
    for word, freq in word_freqs:
        if freq not in freq_groups:
            freq_groups[freq] = []
        freq_groups[freq].append(word)
    
    # Aynı frequency'ye sahip 10+ kelime olan grupları göster
    print(f"\nAynı frequency değerine sahip kelime grupları:")
    duplicate_freqs = {f: words for f, words in freq_groups.items() if len(words) >= 10}
    if duplicate_freqs:
        for freq in sorted(duplicate_freqs.keys(), reverse=True)[:10]:
            words_list = duplicate_freqs[freq]
            print(f"  Frequency {freq:.10f} ({freq:.2e}): {len(words_list)} kelime")
            print(f"    Örnekler: {', '.join(words_list[:5])}...")
    else:
        print("  Aynı frequency'ye sahip 10+ kelime grubu bulunamadı.")
    
    with open(DEBUG_OUTPUT, "w", encoding="utf-8") as debug_out:
        # Başlık satırı
        debug_out.write("kelime\tfrequency\tfull_precision\tscientific_notation\tgeçti_mi\n")
        debug_out.write("-" * 80 + "\n")
        
        # Tüm kelimeleri yaz (daha yüksek hassasiyetle)
        for word, freq in word_freqs_sorted:
            passed = "EVET" if freq >= min_freq else "HAYIR"
            # Full precision ile yaz (Python'ın float hassasiyeti)
            debug_out.write(f"{word}\t{freq}\t{freq:.15f}\t{freq:.2e}\t{passed}\n")
    
    print(f"Tamamlandı!")
    print(f"  Filtrelenmiş kelimeler: {len(filtered_words)} kelime -> '{OUT_FILE}'")
    print(f"  Debug çıktısı: {len(word_freqs)} kelime -> '{DEBUG_OUTPUT}'")
    print(f"\nKullanım önerisi:")
    print(f"  Daha az kelime için: python filter_by_wordfreq.py {min_freq * 10}")
    print(f"  Daha çok kelime için: python filter_by_wordfreq.py {min_freq / 10}")

if __name__ == "__main__":
    main()

