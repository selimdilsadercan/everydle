from sentence_transformers import SentenceTransformer
import numpy as np
from tqdm import tqdm
import json

INPUT_FILE = "words_contexto.txt"
OUTPUT_FILE = "words_contexto_filtered.txt"
OUTPUT_JSON_FILE = "similar_words.json"
SIMILARITY_THRESHOLD = 0.80  # Anlamsal benzerlik eşiği (0.85-0.95 arası önerilir)
PREFIX_SIMILARITY_THRESHOLD = 0.60  # Başlangıç harfleri benzerliği eşiği (0.5-0.7 arası önerilir)

def load_words(path):
    """Kelimeleri dosyadan yükle"""
    with open(path, "r", encoding="utf-8") as f:
        words = [w.strip() for w in f if w.strip()]
    return words

def calculate_prefix_similarity(word1, word2):
    """İki kelimenin başındaki harflerin benzerliğini hesapla (aynı kök kontrolü)"""
    w1 = word1.lower()
    w2 = word2.lower()
    
    # Ortak prefix uzunluğunu bul
    min_len = min(len(w1), len(w2))
    common_prefix_len = 0
    
    for i in range(min_len):
        if w1[i] == w2[i]:
            common_prefix_len += 1
        else:
            break
    
    # En az 3 karakterlik ortak prefix olmalı
    if common_prefix_len < 3:
        return 0.0
    
    # Ortak prefix uzunluğunun, kısa kelimenin uzunluğuna oranı
    # Bu, aynı kökten gelen farklı çekimli kelimeleri yakalar
    shorter_len = min(len(w1), len(w2))
    prefix_similarity = common_prefix_len / shorter_len
    
    return prefix_similarity

def remove_similar_words(words, embeddings, semantic_threshold, prefix_threshold):
    """Hem anlamsal hem başlangıç harfleri benzerliği yüksek olan kelimeleri ele"""
    n = len(words)
    to_remove = set()
    similar_words_dict = {}  # Ana kelime -> benzer kelimeler listesi
    
    print(f"\nBenzerlik analizi yapılıyor...")
    print(f"  Anlamsal benzerlik eşiği: {semantic_threshold}")
    print(f"  Başlangıç harfleri benzerliği eşiği: {prefix_threshold}")
    
    # Her kelime çifti için benzerlik hesapla
    for i in tqdm(range(n), desc="Kelimeler analiz ediliyor"):
        if i in to_remove:
            continue
            
        for j in range(i + 1, n):
            if j in to_remove:
                continue
            
            # Cosine similarity hesapla (anlamsal benzerlik)
            semantic_similarity = np.dot(embeddings[i], embeddings[j])
            
            # Başlangıç harfleri benzerliği hesapla (aynı kök kontrolü)
            prefix_similarity = calculate_prefix_similarity(words[i], words[j])
            
            # Hem anlamsal hem başlangıç harfleri benzerliği yüksek olmalı
            if semantic_similarity >= semantic_threshold and prefix_similarity >= prefix_threshold:
                to_remove.add(j)
                
                # Ana kelimeyi dictionary'ye ekle (yoksa oluştur)
                main_word = words[i]
                similar_word = words[j]
                
                if main_word not in similar_words_dict:
                    similar_words_dict[main_word] = []
                
                similar_words_dict[main_word].append({
                    "word": similar_word,
                    "semantic_similarity": float(semantic_similarity),
                    "prefix_similarity": float(prefix_similarity)
                })
                
                print(f"  '{words[i]}' ve '{words[j]}' benzer (anlam: {semantic_similarity:.4f}, prefix: {prefix_similarity:.4f}) - '{words[j]}' eleniyor")
    
    # Elenen kelimeleri çıkar
    filtered_words = [words[i] for i in range(n) if i not in to_remove]
    return filtered_words, len(to_remove), similar_words_dict

def main():
    print(f"'{INPUT_FILE}' dosyasından kelimeler yükleniyor...")
    words = load_words(INPUT_FILE)
    print(f"{len(words)} kelime yüklendi.")
    
    print("\nModel yükleniyor...")
    model = SentenceTransformer("trmteb/turkish-embedding-model")
    
    print("\nEmbedding'ler hesaplanıyor...")
    embeddings = model.encode(words, batch_size=64, show_progress_bar=True, normalize_embeddings=True)
    
    print(f"\nBenzerlik analizi başlıyor...")
    filtered_words, removed_count, similar_words_dict = remove_similar_words(
        words, embeddings, SIMILARITY_THRESHOLD, PREFIX_SIMILARITY_THRESHOLD
    )
    
    print(f"\n{removed_count} kelime elendi.")
    print(f"{len(filtered_words)} kelime kaldı.")
    
    print(f"\nTemizlenmiş liste '{OUTPUT_FILE}' dosyasına yazılıyor...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for word in filtered_words:
            f.write(word + "\n")
    
    print(f"\nBenzer kelimeler '{OUTPUT_JSON_FILE}' dosyasına yazılıyor...")
    with open(OUTPUT_JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(similar_words_dict, f, ensure_ascii=False, indent=2)
    
    print(f"Bitti! Sonuç: {OUTPUT_FILE}")
    print(f"Benzer kelimeler: {OUTPUT_JSON_FILE}")
    print(f"Orijinal: {len(words)} kelime")
    print(f"Filtrelenmiş: {len(filtered_words)} kelime")
    print(f"Elenen: {removed_count} kelime")
    print(f"Ana kelime sayısı (benzerleri olan): {len(similar_words_dict)}")

if __name__ == "__main__":
    main()

