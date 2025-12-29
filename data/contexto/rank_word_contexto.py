from sentence_transformers import SentenceTransformer
import numpy as np
import json

WORDLIST = "./contexto/words_contexto_filtered.txt"     # temiz liste

def load_words(path):
    with open(path, "r", encoding="utf-8") as f:
        return [w.strip() for w in f if w.strip()]

def main():
    target_word = input("Kelime seçin")
    output_file = "word.json"
    
    print(f"Hedef kelime: {target_word}")
    print("Kelimeler yükleniyor...")
    words = load_words(WORDLIST)
    print(f"{len(words)} kelime yüklendi.")

    print("Model yükleniyor...")
    model = SentenceTransformer("trmteb/turkish-embedding-model")

    print("Embedding hesaplanıyor...")
    embs = model.encode(words, batch_size=64, show_progress_bar=True, normalize_embeddings=True)

    print(f'"{target_word}" kelimesi embed ediliyor...')
    target_emb = model.encode([target_word], normalize_embeddings=True)[0]

    print("Similarity hesaplanıyor...")
    similarities = embs @ target_emb

    print("Sıralanıyor...")
    sorted_idx = np.argsort(-similarities)

    print(f"Sonuç '{output_file}' dosyasına yazılıyor...")
    result = []
    for rank, i in enumerate(sorted_idx, start=1):
        result.append({
            "rank": rank,
            "word": words[i],
            "similarity": round(float(similarities[i]), 6)
        })
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Bitti! Sonuç: {output_file}")

if __name__ == "__main__":
    main()
