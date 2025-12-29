import random

IN_FILE = "./core/words_original.txt"              # ham TDK sözlüğün
OUT_FILE = "./contexto/words_contexto.txt"    # çıkacak temiz liste
BLACKLIST_FILE = "./core/karaliste.txt"   # küfür/istenmeyen kelimeler
blacklist_fix_words = ["ana", "oğlan"]  # Karalistede olsa bile silinmeyecek kelimeler

TR_CHARS = set("abcçdefgğhıijklmnoöprsştuüvyz")
VOWELS = set("aeıioöuü")

def is_good(raw: str) -> bool:
    raw = raw.strip()
    if not raw:
        return False

    # boşluk, noktalama, rakam, özel işaret
    if any(ch.isspace() for ch in raw):
        return False
    if any(ch in "-_./,;:!?\"'()[]{}+*=<>”’" for ch in raw):
        return False
    if any(ch.isdigit() for ch in raw):
        return False

    # büyük harfle başlıyorsa muhtemelen özel isim
    if raw[0].isupper():
        return False

    w = raw.lower()

    # uzunluk
    if len(w) < 2 or len(w) > 15:
        return False

    # sadece Türkçe harfler
    if any(ch not in TR_CHARS for ch in w):
        return False

    # en az bir sesli harf olsun (kısaltmaları at)
    if not any(ch in VOWELS for ch in w):
        return False

    # normalize edilmiş hali ile aynı olsun
    if w != raw:
        return False

    return True


def load_blacklist(path):
    """Karalistedeki kelimeleri yükle"""
    blacklist = set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                word = line.strip().lower()
                if word:
                    blacklist.add(word)
        print(f"Karaliste yüklendi: {len(blacklist)} kelime.")
    except FileNotFoundError:
        print(f"Uyarı: '{path}' dosyası bulunamadı. Karaliste kullanılmayacak.")
    return blacklist

def main():
    print("Karaliste yükleniyor...")
    blacklist = load_blacklist(BLACKLIST_FILE)
    
    # Fix words'ü küçük harfe çevir ve set'e çevir
    fix_words_set = {word.lower() for word in blacklist_fix_words}
    print(f"Fix words (karalisteden hariç tutulacak): {sorted(fix_words_set)}")
    
    print("Ham kelimeler okunuyor...")
    words = []
    removed_words = []  # Karalisteden silinen kelimeler
    
    with open(IN_FILE, "r", encoding="utf-8") as f:
        for line in f:
            raw = line.strip()
            if not raw:
                continue
            if is_good(raw):
                word_lower = raw.lower()
                # Karalistedeki kelimeleri hariç tut, ama fix_words'de olanları tut
                if word_lower in blacklist and word_lower not in fix_words_set:
                    removed_words.append(word_lower)
                else:
                    words.append(word_lower)

    # uniq yap
    words = sorted(set(words))
    removed_words = sorted(set(removed_words))
    
    print(f"\nFiltre ve karaliste sonrası toplam {len(words)} kelime kaldı.")

    print(f"Nihai Contexto listesi: {len(words)} kelime.")

    with open(OUT_FILE, "w", encoding="utf-8") as out:
        for w in words:
            out.write(w + "\n")

    print(f"'{OUT_FILE}' dosyasına yazıldı.")


if __name__ == "__main__":
    main()
