"""
Pokerdle Oyunu için Rastgele Poker Eli Üretici

Bu script, Pokerdle oyunu için 100 rastgele 5 kartlı poker eli üretir.
Her el farklı bir poker kombinasyonu içerir.

Poker El Sıralaması (Güçlüden Zayıfa):
1. Royal Flush (Kral Floşu)
2. Straight Flush (Sıralı Floş)
3. Four of a Kind (Dörtlü)
4. Full House (Ev)
5. Flush (Floş)
6. Straight (Kent)
7. Three of a Kind (Üçlü)
8. Two Pair (İki Çift)
9. One Pair (Bir Çift)
10. High Card (Yüksek Kart)

Dağılım (100 el):
- Royal Flush: 2
- Straight Flush: 5
- Four of a Kind: 8
- Full House: 12
- Flush: 12
- Straight: 12
- Three of a Kind: 15
- Two Pair: 18
- One Pair: 16
"""

import random
import json
from datetime import datetime, timedelta
from typing import List, Tuple

# Başlangıç tarihi (23 Kasım 2025)
START_DATE = datetime(2025, 11, 23)

# Kartlar
SUITS = ['♠', '♥', '♦', '♣']  # Maça, Kupa, Karo, Sinek
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
RANK_VALUES = {r: i for i, r in enumerate(RANKS)}

# Dağılım: Her el türünden kaç tane üretilecek
DISTRIBUTION = {
    'royal_flush': 2,      # Çok nadir, ama eğlenceli olsun
    'straight_flush': 5,
    'four_of_a_kind': 8,
    'full_house': 12,
    'flush': 12,
    'straight': 12,
    'three_of_a_kind': 15,
    'two_pair': 18,
    'one_pair': 16,
    # High card dahil değil - tahmin etmesi zor olur
}

# El isimleri - İngilizce (büyük harf)
HAND_NAMES_EN = {
    'royal_flush': 'ROYAL FLUSH',
    'straight_flush': 'STRAIGHT FLUSH',
    'four_of_a_kind': 'FOUR OF A KIND',
    'full_house': 'FULL HOUSE',
    'flush': 'FLUSH',
    'straight': 'STRAIGHT',
    'three_of_a_kind': 'THREE OF A KIND',
    'two_pair': 'TWO PAIR',
    'one_pair': 'ONE PAIR',
    'high_card': 'HIGH CARD',
}


def card_to_string(rank: str, suit: str) -> str:
    """Kartı string formatına çevirir."""
    return f"{rank}{suit}"


def generate_royal_flush() -> List[Tuple[str, str]]:
    """Royal Flush üret: 10, J, Q, K, A aynı renk."""
    suit = random.choice(SUITS)
    return [('A', suit), ('K', suit), ('Q', suit), ('J', suit), ('10', suit)]


def generate_straight_flush() -> List[Tuple[str, str]]:
    """Straight Flush üret: 5 ardışık kart, aynı renk (Royal Flush hariç)."""
    suit = random.choice(SUITS)
    
    # Başlangıç indeksi (0-8 arası, 9 olursa Royal Flush olur)
    # A-2-3-4-5 (wheel) de dahil
    if random.random() < 0.2:  # %20 şans ile wheel
        return [('A', suit), ('5', suit), ('4', suit), ('3', suit), ('2', suit)]
    
    start_idx = random.randint(0, 8)  # 2'den 10'a kadar başlayabilir
    cards = []
    for i in range(4, -1, -1):  # Büyükten küçüğe
        cards.append((RANKS[start_idx + i], suit))
    return cards


def generate_four_of_a_kind() -> List[Tuple[str, str]]:
    """Four of a Kind üret: 4 aynı değer + 1 kicker."""
    rank = random.choice(RANKS)
    kicker_rank = random.choice([r for r in RANKS if r != rank])
    
    cards = [(rank, suit) for suit in SUITS]
    cards.append((kicker_rank, random.choice(SUITS)))
    
    return cards


def generate_full_house() -> List[Tuple[str, str]]:
    """Full House üret: 3 aynı + 2 aynı."""
    ranks = random.sample(RANKS, 2)
    three_rank, pair_rank = ranks[0], ranks[1]
    
    three_suits = random.sample(SUITS, 3)
    pair_suits = random.sample(SUITS, 2)
    
    cards = [(three_rank, s) for s in three_suits]
    cards.extend([(pair_rank, s) for s in pair_suits])
    
    return cards


def generate_flush() -> List[Tuple[str, str]]:
    """Flush üret: 5 kart aynı renk (sıralı olmayan)."""
    suit = random.choice(SUITS)
    
    # Ardışık olmayan 5 değer seç
    while True:
        ranks = random.sample(RANKS, 5)
        # Straight olup olmadığını kontrol et
        values = sorted([RANK_VALUES[r] for r in ranks])
        is_straight = all(values[i+1] - values[i] == 1 for i in range(4))
        # Wheel kontrolü (A-2-3-4-5)
        is_wheel = values == [0, 1, 2, 3, 12]  # 2,3,4,5,A
        if not is_straight and not is_wheel:
            break
    
    return [(r, suit) for r in ranks]


def generate_straight() -> List[Tuple[str, str]]:
    """Straight üret: 5 ardışık kart, farklı renkler."""
    # Wheel dahil
    if random.random() < 0.15:
        ranks = ['A', '5', '4', '3', '2']
    else:
        start_idx = random.randint(0, 8)
        ranks = RANKS[start_idx:start_idx + 5][::-1]  # Büyükten küçüğe
    
    # En az 2 farklı renk olmalı (flush olmamalı)
    suits = []
    first_suit = random.choice(SUITS)
    suits.append(first_suit)
    
    # En az bir farklı renk ekle
    different_suit = random.choice([s for s in SUITS if s != first_suit])
    different_idx = random.randint(1, 4)
    
    for i in range(1, 5):
        if i == different_idx:
            suits.append(different_suit)
        else:
            suits.append(random.choice(SUITS))
    
    return [(ranks[i], suits[i]) for i in range(5)]


def generate_three_of_a_kind() -> List[Tuple[str, str]]:
    """Three of a Kind üret: 3 aynı + 2 farklı kicker."""
    three_rank = random.choice(RANKS)
    kicker_ranks = random.sample([r for r in RANKS if r != three_rank], 2)
    
    three_suits = random.sample(SUITS, 3)
    
    cards = [(three_rank, s) for s in three_suits]
    
    # Kicker'lar çift olmamalı
    for kr in kicker_ranks:
        cards.append((kr, random.choice(SUITS)))
    
    return cards


def generate_two_pair() -> List[Tuple[str, str]]:
    """Two Pair üret: 2 çift + 1 kicker."""
    pair_ranks = random.sample(RANKS, 2)
    kicker_rank = random.choice([r for r in RANKS if r not in pair_ranks])
    
    cards = []
    for pr in pair_ranks:
        suits = random.sample(SUITS, 2)
        cards.extend([(pr, s) for s in suits])
    
    cards.append((kicker_rank, random.choice(SUITS)))
    
    return cards


def generate_one_pair() -> List[Tuple[str, str]]:
    """One Pair üret: 1 çift + 3 farklı kicker."""
    pair_rank = random.choice(RANKS)
    kicker_ranks = random.sample([r for r in RANKS if r != pair_rank], 3)
    
    pair_suits = random.sample(SUITS, 2)
    cards = [(pair_rank, s) for s in pair_suits]
    
    for kr in kicker_ranks:
        cards.append((kr, random.choice(SUITS)))
    
    return cards


def sort_cards_by_rank(cards: List[Tuple[str, str]]) -> List[Tuple[str, str]]:
    """Kartları değere göre sıralar (büyükten küçüğe)."""
    return sorted(cards, key=lambda x: RANK_VALUES[x[0]], reverse=True)


GENERATORS = {
    'royal_flush': generate_royal_flush,
    'straight_flush': generate_straight_flush,
    'four_of_a_kind': generate_four_of_a_kind,
    'full_house': generate_full_house,
    'flush': generate_flush,
    'straight': generate_straight,
    'three_of_a_kind': generate_three_of_a_kind,
    'two_pair': generate_two_pair,
    'one_pair': generate_one_pair,
}


def main():
    print("=" * 50)
    print("🃏 POKERDLE EL ÜRETİCİ")
    print("=" * 50)
    
    all_hands = []
    
    print("\n📝 Poker elleri üretiliyor...")
    
    for hand_type, count in DISTRIBUTION.items():
        generator = GENERATORS[hand_type]
        
        generated = set()
        attempts = 0
        max_attempts = count * 100
        
        while len(generated) < count and attempts < max_attempts:
            attempts += 1
            cards = generator()
            # Kartları değere göre sırala
            sorted_cards = sort_cards_by_rank(cards)
            # Kart dizisi oluştur
            cards_array = [card_to_string(r, s) for r, s in sorted_cards]
            hand_key = tuple(cards_array)
            
            # Aynı eli tekrar üretmemek için kontrol
            if hand_key not in generated:
                generated.add(hand_key)
                all_hands.append({
                    'name': HAND_NAMES_EN[hand_type],
                    'cards': cards_array,
                    'type': hand_type
                })
        
        print(f"   🎴 {HAND_NAMES_EN[hand_type]}: {len(generated)} el üretildi")
    
    # Tüm elleri karıştır
    random.shuffle(all_hands)
    
    print(f"\n📊 Toplam: {len(all_hands)} el")
    
    # Tarihli liste oluştur
    daily_hands = []
    
    print("\n📌 Günlük Eller:")
    for i, hand_data in enumerate(all_hands):
        date = START_DATE + timedelta(days=i)
        date_str = date.strftime("%d.%m.%Y")
        
        daily_hands.append({
            'date': date_str,
            'name': hand_data['name'],
            'cards': hand_data['cards']
        })
        
        cards_str = ', '.join([f'"{c}"' for c in hand_data['cards']])
        print(f"   {i+1:3}. {date_str} | {hand_data['name']:18} | [{cards_str}]")
    
    # JSON dosyasına kaydet
    output_file = "./pokerdle/hands.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(daily_hands, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 '{output_file}' dosyasına kaydedildi.")
    
    # İstatistik göster
    print("\n📊 Dağılım İstatistikleri:")
    type_counts = {}
    for hand in daily_hands:
        hand_name = hand['name']
        type_counts[hand_name] = type_counts.get(hand_name, 0) + 1
    
    for hand_name, count in type_counts.items():
        print(f"   {hand_name}: {count}")
    
    return daily_hands


if __name__ == "__main__":
    hands = main()
