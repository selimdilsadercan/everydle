"""
Aynı frequency değerine sahip kelimeleri analiz eder.
"""

from wordfreq import word_frequency
from collections import defaultdict

IN_FILE = "words_wordle_5letters.txt"

def main():
    print(f"'{IN_FILE}' dosyası okunuyor...")
    
    # Kelimeleri yükle
    words = []
    with open(IN_FILE, "r", encoding="utf-8") as f:
        for line in f:
            word = line.strip().lower()
            if word and len(word) == 5:
                words.append(word)
    
    print(f"Toplam {len(words)} kelime yüklendi.")
    print("\nFrequency değerleri hesaplanıyor...")
    
    # Her kelimenin frequency'sini al
    word_freqs = []
    freq_to_words = defaultdict(list)
    
    for i, word in enumerate(words):
        if (i + 1) % 500 == 0:
            print(f"  İşleniyor: {i + 1}/{len(words)}...")
        
        try:
            freq = word_frequency(word, 'tr')
            word_freqs.append((word, freq))
            freq_to_words[freq].append(word)
        except:
            freq = 0.0
            word_freqs.append((word, freq))
            freq_to_words[freq].append(word)
    
    # Aynı frequency'ye sahip kelime gruplarını bul
    print(f"\n{'='*80}")
    print("Aynı frequency değerine sahip kelime grupları:")
    print(f"{'='*80}")
    
    duplicate_groups = {freq: words_list for freq, words_list in freq_to_words.items() if len(words_list) > 1}
    
    if duplicate_groups:
        # En çok kelimeye sahip grupları göster
        sorted_groups = sorted(duplicate_groups.items(), key=lambda x: len(x[1]), reverse=True)
        
        print(f"\nToplam {len(duplicate_groups)} farklı frequency değerinde tekrar var.")
        print(f"En çok tekrara sahip ilk 20 grup:\n")
        
        for idx, (freq, words_list) in enumerate(sorted_groups[:20], 1):
            print(f"{idx}. Frequency: {freq:.15f} ({freq:.2e})")
            print(f"   Kelime sayısı: {len(words_list)}")
            print(f"   Kelimeler: {', '.join(words_list[:15])}")
            if len(words_list) > 15:
                print(f"   ... ve {len(words_list) - 15} kelime daha")
            print()
    else:
        print("Aynı frequency değerine sahip kelime grubu bulunamadı.")
    
    # İstatistikler
    print(f"\n{'='*80}")
    print("İstatistikler:")
    print(f"{'='*80}")
    print(f"Toplam farklı frequency değeri: {len(freq_to_words)}")
    print(f"Tek kelimeye sahip frequency değerleri: {sum(1 for w in freq_to_words.values() if len(w) == 1)}")
    print(f"Çoklu kelimeye sahip frequency değerleri: {len(duplicate_groups)}")
    
    # En çok tekrara sahip frequency değerleri
    if duplicate_groups:
        max_count = max(len(words) for words in duplicate_groups.values())
        print(f"En çok tekrara sahip frequency değeri: {max_count} kelime")
        
        # Bu değere sahip tüm frequency'leri göster
        max_freqs = [freq for freq, words in duplicate_groups.items() if len(words) == max_count]
        print(f"Bu sayıda tekrara sahip {len(max_freqs)} farklı frequency değeri var:")
        for freq in max_freqs[:5]:  # İlk 5'ini göster
            print(f"  {freq:.15f} ({freq:.2e}): {len(duplicate_groups[freq])} kelime")

if __name__ == "__main__":
    main()

