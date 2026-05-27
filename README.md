# DOSYATRANS v3.0 - AI File Bridge

**AI asistaninizin bilgisayarinizdaki dosyalara uzaktan erismesini saglayan kopru sistemi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/Version-3.0-blue.svg)]()

---

## Hizli Baslangic

### Zaten Kuruluysa

1. **baslat.bat** dosyasini cift tiklayin
2. Sunucu + Cloudflare Tunnel otomatik baslar
3. Arayuz otomatik acilir (http://localhost:3001)
4. Tunnel URL otomatik algilanir
5. **"Hazir Mesaji Kopyala"** butonuna basin
6. AI sohbetine yapistirin - Bitti!

### Yeni Bilgisayar Icin Kurulum

1. **kur.bat** dosyasini indirin ve calistirin (yonetici olarak)
2. Her sey otomatik kurulur:
   - Node.js (JavaScript calistirma ortami)
   - Cloudflared (Cloudflare Tunnel - internet erisimi)
   - Proje dosyalari (GitHub'dan)
   - npm bagimliliklari
3. **baslat.bat** ile sistemi baslatin

---

## v3.0 Yenilikler

| Ozellik | Aciklama |
|---------|----------|
| Otomatik Tunnel | Cloudflared baslat.bat ile otomatik baslar |
| Tunnel URL Algılama | Socket.IO ile URL otomatik arayuze gonderilir |
| Web Arayuzu | http://localhost:3001 adresinde glass-morphism tasarim |
| Terminal Desteği | Uzak komut calistirma (PowerShell/cmd.exe fix) |
| Batch Islemler | Birden fazla dosya islemi tek istekte |
| Dosya Duzenleme | Mevcut dosyalarda metin degistirme |
| Dosya Izleme | Klasor degisikliklerini gercek zamanli izleme |
| Stream Okuma | Buyuk dosyalar icin parcali okuma |

---

## Dosya Yapisi

```
dosyatrans/
├── baslat.bat           ← ANA DOSYA (bunu calistirin)
├── kur.bat              ← Yeni bilgisayar kurulumu
├── yeniden_baslat.bat   ← Sunucuyu yeniden baslat
├── arayuz.html          ← Web arayuzu (otomatik acilir)
├── server.js            ← Sunucu (v3.0)
├── package.json         ← Bagimliliklar
├── .env.example         ← Ornek ayarlar
├── cloudflared.exe      ← Tunnel (kur.bat ile iner)
└── README.md            ← Bu dosya
```

---

## Kullanım

### 1. Sistemi Baslatin
```
baslat.bat dosyasini cift tiklayin
```

### 2. Tunnel URL Alin
- Cloudflare Tunnel otomatik baslar
- Tunnel URL otomatik olarak arayuzde gorunur
- Manuel olarak da gorebilirsiniz: Terminalde trycloudflare.com URL

### 3. AI'a Bilgi Verin
- "Hazir Mesaji Kopyala" butonuna basin
- AI sohbetine yapistirin

---

## Ozellikler

| Islemler | Aciklama |
|----------|----------|
| Klasor Listeleme | Dizin iceriklerini gorme |
| Dosya Okuma | Dosya icerigini okuma |
| Dosya Yazma | Dosya olusturma/duzenleme |
| Dosya Silme | Dosya/klasor silme |
| Dosya Arama | Isim veya uzanti ile arama |
| Proje Analizi | Proje yapisini ve turunu analiz etme |
| Dosya Kopyalama | Dosya kopyalama |
| Dosya Tasima | Dosya tasima/yeniden adlandirma |
| Batch Islemler | Birden fazla islem tek istekte |
| Dosya Duzenleme | Metin degistirme (find & replace) |
| Stream Okuma | Buyuk dosyalar icin parcali okuma |
| Dosya Izleme | Degisiklikleri gercek zamanli izleme |
| Terminal | Uzak komut calistirma |

---

## Guvenlik

### Token Degistirme

`.env` dosyasi olusturun:
```env
AUTH_TOKEN=benim-gizli-tokenum-123
```

### Klasor Kisitlamalari
```env
ALLOWED_PATHS=D:\Projeler;D:\Work
BLOCKED_PATHS=C:\Windows;C:\System
```

### Tunnel Ayarlari
```env
# Cloudflared otomatik baslatmayi kapat
AUTO_START_CLOUDFLARED=false
```

---

## SSS

### Tunnel URL degisti mi?
Her oturumda yeni URL verilir. Arayuzden guncel URL'i alip AI'a verin.

### Baska bilgisayara nasil kurarim?
`kur.bat` dosyasini yonetici olarak calistirin, her sey otomatik kurulur.

### Baglanti kesilirse?
`yeniden_baslat.bat` dosyasini calistirin.

### Cloudflare Tunnel ucretsiz mi?
Evet, tamamen ucretsiz ve sinirsiz.

### Cloudflared nereye indirilir?
`kur.bat` calistirildiginda `cloudflared.exe` proje klasorune otomatik indirilir.

---

## GitHub

https://github.com/cihangirq/dosyatrans

---

**Made with love for AI-Human Collaboration**
