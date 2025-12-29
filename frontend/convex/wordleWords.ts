// Wordle kelimeleri - words_wordle_5letters_filtered.txt dosyasından
export const WORDLE_WORDS = [
  "KADAR", "SONRA", "DEĞİL", "BÜYÜK", "GÜZEL", "ZAMAN", "NASIL", "BÖYLE", "ARTIK", "DOĞRU",
  "KENDİ", "DEVAM", "DİĞER", "FAZLA", "NEDEN", "OLMAK", "ŞİMDİ", "ÇÜNKÜ", "ANCAK", "BAŞKA",
  "KARŞI", "BÜTÜN", "DÜNYA", "GENEL", "HEMEN", "BUGÜN", "KÜÇÜK", "GELEN", "İNSAN", "KADIN",
  "BİRAZ", "KABUL", "FAKAT", "SAHİP", "ZATEN", "ÇOCUK", "ÜZERE", "KİMSE", "ETMEK", "HAYIR",
  "DEMEK", "ERKEK", "GEREK", "BELKİ", "HAFTA", "OLMAZ", "GEÇEN", "BENCE", "HABER", "HANGİ",
  "YOKSA", "MUTLU", "TAKİP", "LAZIM", "GELİR", "KARAR", "BAĞLI", "HIZLI", "ONLAR", "YAKIN",
  "KOLAY", "YARIN", "BİLGİ", "MERAK", "SABAH", "ÇIKTI", "AKŞAM", "FALAN", "GÜÇLÜ", "OLMUŞ",
  "PARTİ", "VERDİ", "CEVAP", "BÖLÜM", "ÇIKAN", "ALMAK", "BAZEN", "BELLİ", "POLİS", "YEMEK",
  "SANKİ", "BEYAZ", "DURUM", "EYLÜL", "SAVAŞ", "BENDE", "HAYAT", "KALAN", "KİTAP", "CANLI",
  "DENİZ", "İSTER", "MİLLİ", "SORUN", "VİDEO", "GÖREV", "MÜZİK", "SATIN", "TARİH", "UYGUN",
  "HATTA", "RAHAT", "YETER", "HEPSİ", "CİDDİ", "HAZIR", "SAYIN", "TAKIM", "YALAN", "ŞEHİR",
  "ŞÖYLE", "NİSAN", "DAHİL", "İFADE", "SEÇİM", "SÜPER", "GÜNEŞ", "HAYAL", "KESİN", "RESİM",
  "SANAT", "TAMAM", "ŞARKI", "ORTAK", "TEMEL", "ACABA", "DOLAR", "BAYAN", "DOĞUM", "ERKEN",
  "DEĞER", "NEYSE", "DÖNEM", "KEMAL", "ADINA", "KASIM", "YAYIN", "ZARAR", "ALTIN", "BİLİM",
  "GENİŞ", "HENÜZ", "MAYIS", "ŞUBAT", "DOĞAL", "MESAJ", "ORADA", "TATLI", "TÜRLÜ", "YAŞAM",
  "BARIŞ", "ONDAN", "SEZON", "SICAK", "ÇIKAR", "İLERİ", "SELAM", "BEBEK", "BÖLGE", "GİZLİ",
  "SENDE", "YAPMA", "AKTİF", "SİYAH", "HASTA", "YEREL", "HUKUK", "MEDYA", "BASİT", "SEBEP",
  "SOĞUK", "TABİİ", "YAVAŞ", "DÜŞÜK", "NEFES", "AYNEN", "KUZEY", "PAZAR", "YAZAR", "AYDIN",
  "DOĞAN", "GÜNDE", "GÜNEY", "İDDİA", "BİLİR", "GELİN", "GİDER", "KAHVE", "KEŞKE", "SİLAH",
  "TEMİZ", "YARIM", "ÖRNEK", "AŞIRI", "FATİH", "GİRİŞ", "GÜVEN", "PARÇA", "YOĞUN", "YEŞİL",
  "ASKER", "BALIK", "DALGA", "DAVET", "DERİN", "METRE", "SAYGI", "GİREN", "VAKİT", "BAKAN",
  "BAŞTA", "HAKLI", "MURAT", "YERLİ", "ARABA", "GİRDİ", "YAZIK", "HEDEF", "İPTAL", "SEFER",
  "SONUÇ", "TARIM", "DARBE", "SINIF", "DEMİR", "İYİCE", "AŞAĞI", "FİKİR", "HAYDİ", "KÖPEK",
  "YEMİN", "ÖZGÜR", "BASIN", "KOMİK", "SİVİL", "HESAP", "KAYIT", "MODEL", "SAÇMA", "İDARE",
  "BEYİN", "GEÇER", "GURUR", "METİN", "RECEP", "SAKIN", "SEKİZ", "TATİL", "TEPKİ", "YÜZDE",
  "ÇIKIŞ", "ŞEHİT", "BASKI", "ENGEL", "KREDİ", "MADDE", "SEVGİ", "VERME", "YAŞLI", "ÇABUK",
  "YORUM", "ÇİÇEK", "ARAMA", "KAVGA", "TANRI", "ÇÖZÜM", "BİRER", "GARİP", "HALKA", "KANAL",
  "KAYIP", "SAHTE", "EKSİK", "GAYET", "HAFİF", "HAKİM", "MEZUN", "ORAYA", "RAPOR", "ŞEKER",
  "KORKU", "MOBİL", "SOKAK", "ÇEVRE", "ADAMA", "LİDER", "NOKTA", "PROJE", "HUZUR", "HIZLA",
  "KADRO", "METAL", "MOTOR", "ORMAN", "SABİT", "SINAV", "SINIR", "BİZDE", "DÜĞÜN", "HANIM",
  "HARİÇ", "SAKİN", "YASAL", "ANLAM", "AYLIK", "BAKIŞ", "POSTA", "SAHNE", "AŞKIN", "BOMBA",
  "DOKUZ", "FİNAL", "KULAK", "SİNİR", "DAİMA", "EKMEK", "HAKAN", "İDARİ", "KALIN", "OLASI",
  "ZAFER", "ZAYIF", "LANET", "SEVER", "TOPLU", "ÖDEME", "ARACI", "EŞLİK", "GEÇİŞ", "MISIR",
  "NESİL", "RADYO", "SİZDE", "YATAK", "ÇEŞİT", "DÖNÜŞ", "MASUM", "KALMA", "MÜDÜR", "SATIŞ",
  "VERGİ", "ÇELİK", "İKİLİ", "KANUN", "MEMUR", "TALEP", "DÜŞÜN", "GİTME", "İÇERİ", "KONUK",
  "MADEM", "SAYFA", "TIBBİ", "ÇİZGİ", "ÜSTÜN", "ASLAN", "CESUR", "DÖNER", "EYLEM", "İŞGAL",
  "MARUZ", "VATAN", "YAVUZ", "YİRMİ", "BAKMA", "KOYUN", "SELİM", "SİZCE", "YAPIM", "YASAK",
  "ŞÜKÜR", "DUYGU", "GÖNÜL", "GÜMÜŞ", "HAPİS", "TARAF", "TIPKI", "BANKA", "BİLET", "BİTKİ",
  "EKRAN", "FRANK", "NÜFUS", "SIFIR", "YARAR", "BAHAR", "FİLAN", "FORMA", "İŞLEM", "KILIÇ",
  "VÜCUT", "YOLCU", "KATİL", "MEYVE", "OKUMA", "VEFAT", "ZORLA", "MİNİK", "ROMAN", "YARGI",
  "ATMAK", "HASAR", "KURAL", "ALKOL", "DEVRE", "DİREK", "DUVAR", "GÖRÜŞ", "İSYAN", "ŞAHİN",
  "CEMAL", "KIZIL", "SADIK", "TOKAT", "ÖRGÜT", "KAÇAK", "SARAY", "ÇIKMA", "ÖLMEK", "ÖTÜRÜ",
  "BUNCA", "FİZİK", "HÜKÜM", "SANAL", "TUHAF", "YARIŞ", "BOYUN", "BOZUK", "BULUT", "İLHAM",
  "KÖPRÜ", "LAYIK", "NAMAZ", "SUÇLU", "TERİM", "YAKIT", "YAZIN", "YEDEK", "HÜCRE", "KADİR",
  "KULÜP", "MADDİ", "TAVUK", "TESTİ", "DAİRE", "DÜZEY", "HAKEM", "KİRLİ", "MASAJ", "PASTA",
  "PRENS", "TAMİR", "BİRİM", "DOSYA", "ETKİN", "GÜNAH", "HADİS", "İHRAÇ", "KAPAK", "KURUM",
  "PAKET", "TUTAR", "UZMAN", "ALBÜM", "ANTİK", "KALEM", "KATKI", "KISIM", "MELEK", "TEMAS",
  "YAPAY", "ŞARAP", "ŞEKİL", "BAKIM", "MARKA", "METRO", "NİÇİN", "RAKİP", "ÖLMÜŞ", "ŞERİF",
  "AÇMAK", "BEDEN", "KIRIK", "PEMBE", "TABLO", "YANIT", "ARAZİ", "BURCU", "ENGİN", "İSMET",
  "KANLI", "SÜREÇ", "YAZMA", "ÇAĞRI", "ÇEKİM", "ALÇAK", "ERDEM", "GERÇİ", "LİSTE", "PİLOT",
  "TEMİN", "ÖZGÜN", "ŞÜPHE", "EVLAT", "HATUN", "KALIP", "KEYİF", "MADEN", "SAHİL", "UYARI",
  "BANYO", "ELDEN", "KARIN", "KEMİK", "KİMYA", "KOMŞU", "NADİR", "ORTAM", "TARİF", "ADRES",
  "DÜZEN", "GELME", "KUTLU", "MİMAR", "SESLİ", "GÖĞÜS", "HİTAP", "İÇTEN", "ORASI", "TAHTA",
  "TAKMA", "YAVRU", "ARTIŞ", "AÇLIK", "KAZAN", "NAKİT", "VAHŞİ", "ÇEKER", "ŞİRİN", "BELGE",
  "BURUN", "EVVEL", "GÖRME", "İKLİM", "İÇMEK", "KONUŞ", "LAKİN", "OLGUN", "PERDE", "SEÇME",
  "SÖZDE", "YÜZME", "ÇETİN", "ÜCRET", "ŞAHİT", "ACELE", "BİBER", "GALİP", "İLHAN", "REKOR",
  "YILAN", "ALBAY", "BAHİS", "İHSAN", "İLAHİ", "İNANÇ", "KADER", "MAKAM", "SOYLU", "TANIK",
  "ŞİFRE", "AHŞAP", "BUNDA", "CÜMLE", "EVREN", "SALON", "TEKER", "VİRÜS", "YÜKLÜ", "DAMLA",
  "KERİM", "MEZAR", "ÇALIŞ", "ŞEREF", "AHLAK", "BUÇUK", "BIÇAK", "DUMAN", "FAYDA", "KEŞİF",
  "ZORLU", "ANLIK", "CİHAZ", "DELİL", "FAKİR", "İHBAR", "NAZIM", "PAMUK", "SAVCI", "BÖCEK",
  "DERGİ", "FİYAT", "KÖMÜR", "MİRAS", "TAVAN", "TÜRKÜ", "VİLLA", "ÖTEKİ", "ISLAK", "ALARM",
  "SUDAN", "TEKNE", "ZEMİN", "ÇANTA", "ETNİK", "KANAT", "KİLİT", "KIŞIN", "LİMAN", "NEHİR",
  "REZİL", "SÖZLÜ", "TOPLA", "ÖZLEM", "BAHÇE", "BİÇİM", "CEMİL", "HAVUZ", "MESUT", "STRES",
  "TACİZ", "ÖNDER", "ŞAHIS", "BESİN", "BÜTÇE", "DÖVÜŞ", "ESMER", "ESNAF", "KANIT", "KATLI",
  "ROBOT", "SAKLI", "ÜZÜCÜ", "ATAMA", "CELAL", "DENEY", "KARGO", "MERMİ", "POLAT", "YÜZEY",
  "ZEHİR", "ALICI", "BARAJ", "BAĞIŞ", "CEPHE", "DEMET", "İDEAL", "KİTLE", "KONUT", "SERGİ",
  "TEYZE", "YURDU", "ISRAR", "BAŞLI", "BEDEL", "BİLGE", "DETAY", "DOMUZ", "DUYAR", "DÖNME",
  "EŞSİZ", "KAPLI", "PINAR", "TAKSİ", "DİLEK", "İNFAZ", "KURUŞ", "MALUM", "PANİK", "SAÇLI",
  "SENCE", "TAYİN", "TENİS", "TERFİ", "VAKIF", "YAĞLI", "ZİRVE", "CİHAN", "HERİF", "KİRAZ",
  "KONAK", "UTANÇ", "YAĞIŞ", "BAKIR", "DİVAN", "FİRMA", "İHLAL", "KARMA", "LAZER", "MASON",
  "REJİM", "ÇORBA", "ÇIKIN", "ÜZERİ", "ANKET", "BACAK", "GÖLGE", "İTAAT", "KESME", "KOPYA",
  "KURGU", "KURMA", "NİŞAN", "SABIR", "SORMA", "SIKÇA", "YİĞİT", "ÇİFTE", "BAŞAK", "BRAVO",
  "BULMA", "DELİK", "DURMA", "EVRİM", "GİYİM", "GÖZLÜ", "HATİP", "HELAL", "İLAVE", "MONTE",
  "YATAY", "YAZIM", "YETKİ", "YÜZLÜ", "ÇAVUŞ", "AZGIN", "DENGE", "GEÇİT", "GİTAR", "HARAM",
  "İHMAL", "İSTEK", "KATAR", "KONUM", "KÜFÜR", "MASAL", "MERAL", "NÖBET", "TİPİK", "YÖNLÜ",
  "ÇINAR", "ŞAFAK", "BESTE", "DÖVME", "ELMAS", "GEÇME", "GÜCÜN", "KEMER", "KEREM", "MAKUL",
  "NEFİS", "RAHİP", "SAPAN", "TESİS", "TÖREN", "YEMİŞ", "ÇOBAN", "BETON", "CADDE", "DAMAT",
  "DERYA", "GÖZDE", "HİSSE", "İKRAM", "İTHAL", "KURUL", "KÖYLÜ", "LİMON", "PASİF", "REFAH",
  "SUBAY", "TOLGA", "YABAN", "ÇEKME", "ÇOKLU", "ÜZGÜN", "BOYUT", "BOĞAZ", "DÜZCE", "GİRME",
  "İŞSİZ", "KABLO", "KAÇAR", "KESİM", "MASKE", "MEŞRU", "MİZAH", "TEKİN", "TÜNEL", "YÜZÜK",
  "ÇAKIR", "ÇEŞME", "BORSA", "BUHAR", "DAYAK", "EVCİL", "NİHAİ", "OPTİK", "PİZZA", "SAPIK",
  "ÖĞLEN", "ŞAYET", "AŞAMA", "DİLİM", "DÖNÜM", "DÖVİZ", "İFLAS", "İRADE", "İRFAN", "KAYAK",
  "ORGAN", "SAYIM", "SEBZE", "SEMİH", "TOPÇU", "TÜTÜN", "ÇAMUR", "ŞOFÖR", "ENDER", "HAYLİ",
  "HEKİM", "HÜCUM", "HÜLYA", "MORAL", "NASİP", "NİYET", "SAĞIR", "TÜFEK", "AFYON", "BİREY",
  "DÖNÜK", "DÜŞME", "FAZIL", "GÖVDE", "KÖFTE", "KÜREK", "NESNE", "OPERA", "SEVDA", "SOLUK",
  "ÇALAR", "ÇARŞI", "ARENA", "DİKEY", "ESPRİ", "GAYRİ", "GİZEM", "KANKA", "KİBAR", "MESAİ",
  "SOMUT", "VEKİL", "YALIN", "BEKAR", "BOYLU", "DİYET", "HALUK", "İSPAT", "KAZIM", "NAZİK",
  "REHİN", "SATIR", "ZALİM", "ŞAHSİ", "GÖBEK", "HANDE", "KAÇIŞ", "KESER", "KOYAR", "KIRIM",
  "NECİP", "SAKAT", "YÜREK", "AKTÖR", "BOLCA", "DUDAK", "FORUM", "HİLAL", "İZZET", "MİKRO",
  "TAKAS", "ZENCİ", "ÇORAP", "DENLİ", "DİKEN", "KUMAR", "MAFYA", "MÜHİM", "NEMLİ", "SAKIZ",
  "SEYİR", "SOĞAN", "TAVIR", "TELİF", "TUZAK", "ZULÜM", "CASUS", "DAMAR", "DESEN", "DÜNKÜ",
  "FİDAN", "KOYMA", "KÖKLÜ", "PAPAZ", "RAKAM", "TİLKİ", "TUTMA", "VARAN", "ÇEVİK", "BERAT",
  "ELEME", "OĞLAN", "SİVRİ", "SÜRÜM", "TEORİ", "TUZLU", "ÇAPLI", "ÜREME", "IRKÇI", "DEVİR",
  "ELBET", "FETİH", "LİTRE", "SERİN", "TOHUM", "ZARİF", "ZİHİN", "ÖNLEM", "ŞAPKA", "AKREP",
  "HAMLE", "İLKEL", "TABAN", "ÇOKÇA", "ABONE", "ARŞİV", "DİKİŞ", "DÜŞÜŞ", "GÜREŞ", "İHALE",
  "KAŞIK", "KIRAN", "MEHDİ", "ROKET", "TEKME", "TEYİT", "CEKET", "ERGİN", "ESNEK", "HARBİ",
  "YETİM", "ÇİZİM", "ÇUKUR", "ÜÇGEN", "ŞABAN", "ASİST", "BEYAN", "GEYİK", "GEÇİM", "HAFIZ",
  "HAMUR", "HAVLU", "HAÇLI", "İDRAR", "İTİCİ", "KENAR", "PLAKA", "SİNEK", "SÜSLÜ", "TUTKU",
  "YANIK", "ÇUBUK", "ISSIZ", "BASTI", "BRONZ", "DEFNE", "EMLAK", "HEYET", "KISMİ", "SIĞIR",
  "TANIM", "YENİK", "ÇANAK", "ÖLÇÜM"
];

// Türkçe büyük harfe çevirme fonksiyonu
export function toTurkishUpperCase(str: string): string {
  return str
    .split("")
    .map((char) => {
      if (char === "i") return "İ";
      if (char === "ı") return "I";
      if (char === "ç") return "Ç";
      if (char === "ğ") return "Ğ";
      if (char === "ö") return "Ö";
      if (char === "ş") return "Ş";
      if (char === "ü") return "Ü";
      return char.toUpperCase();
    })
    .join("");
}

// Rastgele kelime seçme fonksiyonu
export function getRandomWord(): string {
  return WORDLE_WORDS[Math.floor(Math.random() * WORDLE_WORDS.length)];
}
