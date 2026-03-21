# 🌉 DOSYATRANS - AI File Bridge

**AI asistanınızın bilgisayarınızdaki dosyalara uzaktan erişmesini sağlayan güvenli köprü sistemi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)]()

---

## 📖 İçindekiler

- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Kurulum](#kurulum)
- [Tunnel Seçenekleri](#tunnel-seçenekleri)
- [Kullanım](#kullanım)
- [Güvenlik](#güvenlik)
- [API Referansı](#api-referansı)

---

## Hızlı Başlangıç

### 1. İndir

```bash
git clone https://github.com/cihangirq/dosyatrans.git
cd dosyatrans
```

veya ZIP olarak indir: https://github.com/cihangirq/dosyatrans/archive/refs/heads/main.zip

### 2. Kur

```bash
npm install
```

### 3. Sunucuyu Başlat

```bash
npm start
```

veya Windows'ta `start.bat` dosyasını çift tıklayın.

### 4. Tunnel Oluştur

**Önerilen: Cloudflare Tunnel** (Sınırsız, sabit URL)

```bash
# Otomatik kurulum için:
install-cloudflared.bat

# Sonra tunnel başlatın:
start-cloudflared.bat
```

**Alternatif: Ngrok** (2 saat sınırı, değişen URL)

```bash
ngrok http 3001
```

### 5. AI Asistanına Ver

- **Tunnel URL**: `https://xxx.trycloudflare.com` veya `https://xxx.ngrok-free.app`
- **Token**: `dosyatrans-secure-token-2024`

---

## Kurulum

### Windows

1. **Node.js Kontrol Et**
   ```powershell
   node --version
   ```
   Yüklü değilse: https://nodejs.org/ adresinden indirin

2. **Projeyi İndir ve Kur**
   ```powershell
   git clone https://github.com/cihangirq/dosyatrans.git
   cd dosyatrans
   npm install
   ```

3. **Başlat**
   ```powershell
   start.bat
   ```

### macOS / Linux

```bash
# Node.js kontrol et
node --version

# Proje kur
git clone https://github.com/cihangirq/dosyatrans.git
cd dosyatrans
npm install

# Başlat
chmod +x start.sh
./start.sh
```

---

## Tunnel Seçenekleri

### 🔵 Cloudflare Tunnel (Önerilen)

| Özellik | Değer |
|---------|-------|
| Süre sınırı | ❌ Yok (Sınırsız) |
| URL sabitliği | ✅ Oturum boyunca sabit |
| Ücret | Ücretsiz |
| Kayıt | Gerekli değil (quick tunnel) |

**Kurulum:**

1. `install-cloudflared.bat` dosyasını çalıştırın
2. `start-cloudflared.bat` ile tunnel başlatın
3. Verilen URL'yi AI asistanınıza verin

### 🟡 Ngrok (Alternatif)

| Özellik | Free Plan | Ücretli |
|---------|-----------|---------|
| Süre sınırı | ⚠️ 2 saat | Sınırsız |
| URL sabitliği | ❌ Değişiyor | ✅ Sabit |
| WebSocket | ✅ Çalışıyor | ✅ Çalışıyor |

**Kurulum:**

1. https://ngrok.com/ adresinden indirin
2. `ngrok http 3001` komutunu çalıştırın

---

## Kullanım

### AI Asistanı ile Kullanım

AI asistanınıza şu şekilde istekte bulunun:

```
Tunnel URL: https://xxx.trycloudflare.com
Token: dosyatrans-secure-token-2024

D:\Projeler\MyApp klasörünü analiz eder misin?
```

### Örnek İşlemler

- ✅ Klasör içeriğini listeleme
- ✅ Dosya okuma ve düzenleme
- ✅ Proje analizi
- ✅ Dosya arama
- ✅ Yeni dosya oluşturma

---

## Güvenlik

### ⚠️ Önemli Uyarılar

1. **Token'ı Değiştirin!**
   
   `.env` dosyası oluşturun:
   ```env
   AUTH_TOKEN=benim-gizli-tokenum-123
   ```

2. **Tunnel'ı Kapatın**
   
   Kullanmadığınızda terminali kapatın.

3. **Klasör Kısıtlamaları**
   
   ```env
   ALLOWED_PATHS=D:\Projeler;D:\Work
   BLOCKED_PATHS=C:\Windows;C:\System
   ```

---

## API Referansı

### HTTP Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/` | GET | Sunucu durumu |
| `/health` | GET | Sağlık kontrolü |
| `/drives` | GET | Sürücüleri listele |
| `/auth` | POST | Token doğrulama |

### WebSocket Events

| Event | Açıklama |
|-------|----------|
| `auth` | Kimlik doğrulama |
| `fs:list` | Dizin listele |
| `fs:read` | Dosya oku |
| `fs:write` | Dosya yaz |
| `fs:delete` | Dosya sil |
| `fs:search` | Dosya ara |
| `fs:analyze` | Proje analiz et |
| `fs:mkdir` | Klasör oluştur |
| `fs:copy` | Dosya kopyala |
| `fs:move` | Dosya taşı |
| `fs:rename` | Yeniden adlandır |

### Örnek Kullanım

```javascript
import { io } from 'socket.io-client';

const socket = io('https://your-tunnel-url');

// Kimlik doğrulama
socket.emit('auth', { token: 'your-token' });

// Dosya listele
socket.emit('fs:list', { path: 'D:\\Projects' });

// Sonuç al
socket.on('fs:list:result', (data) => {
  console.log(data.items);
});
```

---

## Dosya Yapısı

```
dosyatrans/
├── server.js              → Ana sunucu
├── package.json           → Bağımlılıklar
├── start.bat              → Windows başlatma
├── start.sh               → Linux/macOS başlatma
├── install-cloudflared.bat→ Cloudflared kurulum
├── start-cloudflared.bat  → Cloudflared tunnel başlat
├── .env.example           → Örnek ortam değişkenleri
├── .gitignore             → Git ignore
├── LICENSE                → MIT Lisans
└── README.md              → Bu dosya
```

---

## Sıkça Sorulan Sorular

### Ngrok mu Cloudflare mi?
**Cloudflare** önerilir. Sınırsız süre ve daha stabil.

### Bağlantı kesilirse ne yapmalıyım?
Tunnel'ı yeniden başlatın ve yeni URL'yi AI'a verin.

### Birden fazla AI bağlanabilir mi?
Evet, birden fazla istemci aynı anda bağlanabilir.

### Dosya boyutu sınırı var mı?
Varsayılan 10MB. `.env` dosyasında `MAX_FILE_SIZE` ile değiştirin.

---

## Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## İletişim

GitHub: https://github.com/cihangirq/dosyatrans

---

**Made with ❤️ for AI-Human Collaboration**
