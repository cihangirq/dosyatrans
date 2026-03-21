# 🌉 DOSYATRANS - AI File Bridge

**AI asistanınızın bilgisayarınızdaki dosyalara uzaktan erişmesini sağlayan köprü sistemi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)]()

---

## 🚀 Hızlı Başlangıç

### Zaten Kuruluysa

1. **baslat.bat** dosyasını çift tıklayın
2. Terminal açılır ve tunnel başlar
3. Arayüz otomatik açılır
4. URL'i kutuya yapıştırın
5. **"Hazır Mesajı Kopyala"** butonuna basın
6. AI sohbetine yapıştırın → Bitti!

### Yeni Bilgisayar İçin Kurulum

1. **kur.bat** dosyasını indirin ve çalıştırın
2. Her şey otomatik kurulur:
   - ✅ Node.js
   - ✅ Proje dosyaları (GitHub'dan)
   - ✅ Cloudflared
3. **baslat.bat** ile sistemi başlatın

---

## 📁 Dosya Yapısı

```
dosyatrans/
├── baslat.bat       ← ANA DOSYA (bunu çalıştırın)
├── arayuz.html      ← Arayüz (otomatik açılır)
├── kur.bat          ← Yeni bilgisayar kurulumu
├── server.js        ← Sunucu
├── package.json     ← Bağımlılıklar
├── cloudflared.exe  ← Tunnel (otomatik indirilir)
└── .env.example     ← Örnek ayarlar
```

---

## 🎯 Kullanım

### 1. Sistemi Başlatın
```
baslat.bat dosyasını çift tıklayın
```

### 2. Tunnel URL'i Alın
- Terminal'de `trycloudflare.com` ile biten URL görünür
- Bu URL'i arayüzdeki kutuya yapıştırın

### 3. AI'a Bilgi Verin
- "Hazır Mesajı Kopyala" butonuna basın
- AI sohbetine yapıştırın

---

## ⚡ Özellikler

| Özellik | Açıklama |
|---------|----------|
| 🚀 Tek Tık | baslat.bat ile her şey hazır |
| 🌐 Arayüz | Kopyalanabilir hazır mesaj |
| 📦 Otomatik Kurulum | kur.bat ile her şey kurulur |
| ☁️ Cloudflare Tunnel | Sınırsız, ücretsiz |
| 🔄 Gerçek Zamanlı | WebSocket ile anlık erişim |

---

## 📋 Yapabilecekleriniz

| İşlem | Açıklama |
|-------|----------|
| 📂 Klasör Listeleme | Dizin içeriklerini görme |
| 📄 Dosya Okuma | Dosya içeriğini okuma |
| ✏️ Dosya Yazma | Dosya oluşturma/düzenleme |
| 🗑️ Silme | Dosya/klasör silme |
| 🔍 Arama | Dosya arama |
| 📊 Analiz | Proje analizi |

---

## 🔒 Güvenlik

### Token Değiştirme

`.env` dosyası oluşturun:
```env
AUTH_TOKEN=benim-gizli-tokenum-123
```

### Klasör Kısıtlamaları
```env
ALLOWED_PATHS=D:\Projeler;D:\Work
BLOCKED_PATHS=C:\Windows;C:\System
```

---

## ❓ SSS

### Tunnel URL değişti mi?
Her oturumda yeni URL verilir. Arayüzden güncel URL'i alıp AI'a verin.

### Başka bilgisayara nasıl kurarım?
`kur.bat` dosyasını çalıştırın, her şey otomatik kurulur.

### Bağlantı kesilirse?
`baslat.bat` dosyasını tekrar çalıştırın.

### Cloudflare Tunnel ücretsiz mi?
Evet, tamamen ücretsiz ve sınırsız.

---

## 📖 GitHub

https://github.com/cihangirq/dosyatrans

---

**Made with ❤️ for AI-Human Collaboration**
