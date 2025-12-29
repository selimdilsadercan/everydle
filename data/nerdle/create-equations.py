"""
Nerdle Oyunu için Rastgele Denklem Üretici

Bu script, Nerdle oyunu için 100 geçerli matematiksel denklem üretir.
Her denklem tam olarak 8 karakter uzunluğundadır.
Kullanılan karakterler: 0-9, +, -, *, /, =

Dağılım:
- Toplama (+): 25
- Çıkarma (-): 25
- Çarpma (*): 30
- Bölme (/): 20
"""

import random
import json
from datetime import datetime, timedelta

# Denklem uzunluğu (Nerdle standart: 8 karakter)
EQUATION_LENGTH = 8

# Başlangıç tarihi
START_DATE = datetime(2025, 11, 23)

# Her operatör için kaç denklem seçilecek
DISTRIBUTION = {
    '+': 25,
    '-': 25,
    '*': 30,
    '/': 20,
}


def is_valid_equation(equation: str) -> bool:
    """Bir denklemin geçerli olup olmadığını kontrol eder."""
    if '=' not in equation or len(equation) != EQUATION_LENGTH:
        return False
    
    parts = equation.split('=')
    if len(parts) != 2:
        return False
    
    left, right = parts
    
    try:
        left_result = eval(left)
        right_result = eval(right)
        return abs(left_result - right_result) < 0.0001
    except:
        return False


def generate_addition_equations() -> set:
    """Toplama denklemleri: a + b = c"""
    equations = set()
    for a in range(1, 100):
        for b in range(1, 100):
            c = a + b
            eq = f"{a}+{b}={c}"
            if len(eq) == EQUATION_LENGTH:
                equations.add(eq)
    return equations


def generate_subtraction_equations() -> set:
    """Çıkarma denklemleri: a - b = c"""
    equations = set()
    for a in range(10, 200):
        for b in range(1, a):
            c = a - b
            eq = f"{a}-{b}={c}"
            if len(eq) == EQUATION_LENGTH:
                equations.add(eq)
    return equations


def generate_multiplication_equations() -> set:
    """Çarpma denklemleri: a * b = c"""
    equations = set()
    for a in range(2, 50):
        for b in range(2, 50):
            c = a * b
            eq = f"{a}*{b}={c}"
            if len(eq) == EQUATION_LENGTH:
                equations.add(eq)
    return equations


def generate_division_equations() -> set:
    """Bölme denklemleri: a / b = c"""
    equations = set()
    for b in range(2, 30):
        for c in range(2, 30):
            a = b * c
            eq = f"{a}/{b}={c}"
            if len(eq) == EQUATION_LENGTH:
                equations.add(eq)
    return equations


def main():
    print("=" * 50)
    print("🧮 NERDLE DENKLEM ÜRETİCİ")
    print("=" * 50)
    
    # Her tip için ayrı ayrı üret
    print("\n📝 Denklemler üretiliyor...")
    
    add_eqs = generate_addition_equations()
    sub_eqs = generate_subtraction_equations()
    mul_eqs = generate_multiplication_equations()
    div_eqs = generate_division_equations()
    
    # Doğrula
    add_valid = [eq for eq in add_eqs if is_valid_equation(eq)]
    sub_valid = [eq for eq in sub_eqs if is_valid_equation(eq)]
    mul_valid = [eq for eq in mul_eqs if is_valid_equation(eq)]
    div_valid = [eq for eq in div_eqs if is_valid_equation(eq)]
    
    print(f"   ➕ Toplama: {len(add_valid)} denklem")
    print(f"   ➖ Çıkarma: {len(sub_valid)} denklem")
    print(f"   ✖️ Çarpma: {len(mul_valid)} denklem")
    print(f"   ➗ Bölme: {len(div_valid)} denklem")
    
    # Belirtilen sayıda rastgele seç
    selected_add = random.sample(add_valid, min(DISTRIBUTION['+'], len(add_valid)))
    selected_sub = random.sample(sub_valid, min(DISTRIBUTION['-'], len(sub_valid)))
    selected_mul = random.sample(mul_valid, min(DISTRIBUTION['*'], len(mul_valid)))
    selected_div = random.sample(div_valid, min(DISTRIBUTION['/'], len(div_valid)))
    
    # Birleştir ve karıştır
    all_selected = selected_add + selected_sub + selected_mul + selected_div
    random.shuffle(all_selected)
    
    print(f"\n📊 Seçilen denklemler:")
    print(f"   ➕ Toplama: {len(selected_add)}")
    print(f"   ➖ Çıkarma: {len(selected_sub)}")
    print(f"   ✖️ Çarpma: {len(selected_mul)}")
    print(f"   ➗ Bölme: {len(selected_div)}")
    print(f"   📋 TOPLAM: {len(all_selected)}")
    
    # Tarihli liste oluştur
    daily_equations = []
    
    print("\n📌 Denklemler:")
    for i, eq in enumerate(all_selected):
        date = START_DATE + timedelta(days=i)
        date_str = date.strftime("%d.%m.%Y")
        
        daily_equations.append({
            "date": date_str,
            "equation": eq
        })
        
        # Operatör ikonunu belirle
        if '+' in eq.split('=')[0]:
            icon = "➕"
        elif '-' in eq.split('=')[0]:
            icon = "➖"
        elif '*' in eq.split('=')[0]:
            icon = "✖️"
        else:
            icon = "➗"
        print(f"   {i+1:3}. {date_str} | {icon} {eq}")
    
    # JSON dosyasına kaydet
    output_file = "equations.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(daily_equations, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 '{output_file}' dosyasına kaydedildi.")
    
    return daily_equations


if __name__ == "__main__":
    equations = main()
