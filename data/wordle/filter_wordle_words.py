"""
Wordle için 5 harfli kelimeleri filtreler.
words_contexto.txt dosyasından sadece 5 harfli kelimeleri çıkarır.
"""

IN_FILE = "./contexto/words_contexto.txt"
OUT_FILE = "./wordle/words_wordle_5letters.txt"

def main():
    print("5 harfli kelimeler filtreleniyor...")
    
    words_5letters = []
    
    with open(IN_FILE, "r", encoding="utf-8") as f:
        for line in f:
            word = line.strip().lower()
            # Sadece tam 5 harfli kelimeleri al
            if len(word) == 5:
                words_5letters.append(word)
    
    # Tekrarları kaldır ve sırala
    words_5letters = sorted(set(words_5letters))
    
    print(f"Toplam {len(words_5letters)} adet 5 harfli kelime bulundu.")
    
    # Dosyaya yaz
    with open(OUT_FILE, "w", encoding="utf-8") as out:
        for word in words_5letters:
            out.write(word + "\n")
    
    print(f"'{OUT_FILE}' dosyasına yazıldı.")
    
    # İlk 10 kelimeyi göster
    if words_5letters:
        print(f"\nİlk 10 kelime örneği: {words_5letters[:10]}")


if __name__ == "__main__":
    main()

