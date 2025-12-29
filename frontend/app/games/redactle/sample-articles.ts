// Turkish Wikipedia article titles (base64 encoded)
// Format: base64encode(article_title)
export const TURKISH_ARTICLE_TITLES = [
  "VMO8cmtpeWU=", // Türkiye
  "xLBzdGFuYnVs", // İstanbul
  "QW5rYXJh", // Ankara
  "TXVzdGFmYV9LZW1hbF9BdGF0w7xyaw==", // Mustafa_Kemal_Atatürk
  "QW5hZG9sdQ==", // Anadolu
  "xLB6bWly", // İzmir
  "QnVyc2E=", // Bursa
  "QW50YWx5YQ==", // Antalya
  "R2F6aWFudGVw", // Gaziantep
  "S29ueWE=", // Konya
  "QWRhbmE=", // Adana
  "xZ5hbmzEsXVyZmE=", // Şanlıurfa
  "TWVyc2lu", // Mersin
  "RGl5YXJiYWvEsXI=", // Diyarbakır
  "S2F5c2VyaQ==", // Kayseri
  "RXNracifc2VoaXI=", // Eskişehir
  "VHJhYnpvbg==", // Trabzon
  "RGVuaXpsaQ==", // Denizli
  "U2Ftc3Vu", // Samsun
  "S2FocmFtYW5tYXJhxZ8=", // Kahramanmaraş
  "QmFsxLFrZXNpcg==", // Balıkesir
  "VmFu", // Van
  "QXlkxLFu", // Aydın
  "VGVraXJkYcSf", // Tekirdağ
  "U2FuYXlp", // Sanayi
  "TWFuaXNh", // Manisa
  "S29jYWVsaQ==", // Kocaeli
  "SGF0YXk=", // Hatay
  "TWFsYXR5YQ==", // Malatya
  "RXJ6dXJ1bQ==", // Erzurum
  "QWRpeWFtYW4=", // Adıyaman
  "U2FrYXJ5YQ==", // Sakarya
  "RWxhesysSQ==", // Elazığ
  "RXJ6aW5jYW4=", // Erzincan
  "U2l2YXM=", // Sivas
  "T3JkdQ==", // Ordu
  "S8SxcsSxa2thbGU=", // Kırıkkale
  "QXJ0dmlu", // Artvin
  "VXNhaw==", // Uşak
  "RMO8emNl", // Düzce
  "T3NtYW5peWU=", // Osmaniye
  "QWZZb25rYXJhaGlzYXI=", // Afyonkarahisar
  "S2FyYWLDvGs=", // Karabük
  "Qm9sdQ==", // Bolu
  "S8SxcsSxa2tyZWxp", // Kırklareli
  "Q2FuYWtrYWxl", // Çanakkale
  "TXXEn2xh", // Muğla
  "QmlsZWNpaw==", // Bilecik
  "TmV2xZ9laGly", // Nevşehir
  "WW96Z2F0", // Yozgat
  "VG9rYXQ=", // Tokat
  "QXJkYWhhbg==", // Ardahan
  "R8O8bXXFn2hhbmU=", // Gümüşhane
  "S2FzdGFtb251", // Kastamonu
  "UsSxemU=", // Rize
  "QWtyYXk=", // Aksaray
  "TmlnyWRl", // Niğde
  "S2FyYW1hbg==", // Karaman
  "S8SxcsWfZWhpcg==", // Kırşehir
  "QmF0bWFu", // Batman
  "xZ5pcm5haw==", // Şırnak
  "QmFydMSxbg==", // Bartın
  "QXJkYWhhbg==", // Ardahan
  "ScSfZMSxcg==", // Iğdır
  "WWFsb3Zh", // Yalova
  "S2FyYWLDvGs=", // Karabük
  "S2lsaXM=", // Kilis
  "T3NtYW5peWU=", // Osmaniye
  "RMO8emNl", // Düzce
];

// Sample articles for fallback (when Wikipedia API fails)
export const SAMPLE_ARTICLES = {
  Türkiye: {
    title: "Türkiye",
    content: `Türkiye, Asya ile Avrupa kıtaları arasında yer alan ve her iki kıtaya da toprakları bulunan bir Avrasya ülkesidir. Ülke topraklarının yüzde 97'si Asya kıtasında yer alan Anadolu'da, yüzde 3'ü ise Avrupa kıtasında yer alan Trakya'dadır. Ankara başkenti, İstanbul en büyük şehridir. Türkiye'nin resmi dili Türkçedir. Ülke nüfusu 2023 yılı verilerine göre 85 milyonu geçmiştir. Türkiye Cumhuriyeti, 29 Ekim 1923 tarihinde kurulmuştur.`,
  },  İstanbul: {
    title: "İstanbul",
    content: `İstanbul, Türkiye'nin en kalabalık, ekonomik ve kültürel açıdan en önemli şehridir. Şehir, Boğaziçi ile ikiye ayrılır ve bu boğaz Avrupa ve Asya kıtalarını birbirinden ayırır. İstanbul, tarihi boyunca Bizans İmparatorluğu ve Osmanlı İmparatorluğu gibi büyük imparatorlukların başkenti olmuştur. Ayasofya, Topkapı Sarayı, Sultanahmet Camii gibi tarihi yapıları ile ünlüdür. Şehir aynı zamanda önemli bir liman ve ticaret merkezidir.`,
  },
  Ankara: {
    title: "Ankara",
    content: `Ankara, Türkiye Cumhuriyeti'nin başkenti ve en kalabalık ikinci ilidir. İç Anadolu Bölgesi'nde yer alır. Cumhuriyet döneminde başkent olarak seçilmiştir. Anıtkabir, Atatürk'ün mozolesi olarak şehrin en önemli yapılarından biridir. Ankara Kalesi, tarihi merkezde yer alan önemli bir turistik noktadır. Şehir, Türkiye'nin politik ve idari merkezidir.`,
  },
  "Mustafa Kemal Atatürk": {
    title: "Mustafa Kemal Atatürk",
    content: `Mustafa Kemal Atatürk, Türkiye Cumhuriyeti'nin kurucusu ve ilk cumhurbaşkanıdır. 1881 yılında Selanik'te doğmuştur. Kurtuluş Savaşı'nın lideridir. 29 Ekim 1923'te Cumhuriyeti ilan etmiştir. Atatürk, Türkiye'de birçok devrim ve reform gerçekleştirmiştir. Laiklik, eğitim, hukuk ve kadın hakları alanlarında önemli değişiklikler yapmıştır. 10 Kasım 1938'de İstanbul'da vefat etmiştir.`,
  },
  Anadolu: {
    title: "Anadolu",
    content: `Anadolu, Asya kıtasının batı ucunda yer alan bir yarımadadır. Türkiye topraklarının büyük bölümünü kapsar. Tarih boyunca birçok medeniyete ev sahipliği yapmıştır. Hititler, Frigyalılar, Lidyalılar, Persler, Romalılar ve Selçuklular Anadolu'da yaşamış önemli medeniyetlerdendir. Coğrafi olarak Doğu Anadolu, İç Anadolu ve diğer bölgelere ayrılır. Zengin bir kültürel mirasa sahiptir.`,
  },
};
