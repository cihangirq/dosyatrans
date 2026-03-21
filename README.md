# 🌉 DOSYATRANS - AI File Bridge

**AI asistanınızın bilgisayarınızdaki dosyalara uzaktan erişmesini sağlayan güvenli köprü sistemi.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)]()

---

## 📖 İçindekiler

- [Nedir?](#nedir)
- [Özellikler](#özellikler)
- [Hızlı Başlangıç](#hızlı-başlangıç)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [Güvenlik](#güvenlik)
- [API Referansı](#api-referansı)
- [Sıkça Sorulan Sorular](#sıkça-sorulan-sorular)

---

## Nedir?

DOSYATRANS, AI asistanlarınızın (ChatGPT, Claude, vb.) bilgisayarınızdaki dosyalara güvenli bir şekilde erişmesini sağlayan bir köprü sistemidir.

### Nasıl Çalışır?

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Bilgisayarınız │ ◄─────► │    Tunnel       │ ◄─────► │   AI Asistan    │
│  (Bridge Server) │         │ (ngrok/cf tunnel)│         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        │
        ▼
┌─────────────────┐
│   Dosyalarınız   │
│   C:\, D:\, /    │
└─────────────────┘
```

1. **Bridge Server** bilgisayarınızda çalışır
2. **Tunnel** ile dış dünyaya güvenli açılır
3. **AI Asistan** tunnel üzerinden bağlanır
4. Dosyalarınıza erişim sağlanır

---

## Özellikler

### 🔒 Güvenlik
- Token tabanlı kimlik doğrulama
- İsteğe bağlı klasör erişim kısıtlamaları
- Tüm işlemler loglanır

### 📁 Dosya İşlemleri
| İşlem | Açıklama |
|-------|----------|
| 📂 List | Dizin içeriklerini listele |
| 📄 Read | Dosya oku (satır bazlı da desteklenir) |
| ✏️ Write | Dosya yaz/oluştur |
| 🗑️ Delete | Dosya/klasör sil |
| 📁 Mkdir | Klasör oluştur |
| 📋 Copy | Dosya kopyala |
| 📦 Move | Dosya taşı |
| ✏️ Rename | Yeniden adlandır |
| 🔍 Search | Dosya ara |
| 📊 Analyze | Proje analizi |

### 🖥️ Platform Desteği
- ✅ Windows (tüm sürücüler)
- ✅ macOS
- ✅ Linux

### 🚀 Performans
- WebSocket ile gerçek zamanlı iletişim
- Büyük dosyalar için streaming desteği
- Verimli dosya arama algoritması

---

## Hızlı Başlangıç

### 1. Gereksinimler
- [Node.js 16+](https://nodejs.org/) kurulu olmalı
- İnternet bağlantısı (tunnel için)

### 2. İndir ve Kur

```bash
# GitHub'dan indir
git clone https://github.com/cihangirq/dosyatrans.git
cd dosyatrans

# Bağımlılıkları yükle
npm install
```

### 3. Sunucuyu Başlat

```bash
npm start
```

veya Windows'ta:
```bash
start.bat
```

Linux/macOS'ta:
```bash
chmod +x start.sh
./start.sh
```

### 4. Tunnel Oluştur

**Ngrok ile:**
```bash
ngrok http 3001
```

**Cloudflare Tunnel ile:**
```bash
cloudflared tunnel --url http://localhost:3001
```

### 5. AI Asistanına Ver

AI asistanınıza şu bilgileri verin:
- **Tunnel URL**: `https://abc123.ngrok.io`
- **Token**: `dosyatrans-secure-token-2024`

---

## Kurulum

### Detaylı Kurulum

#### Windows

```powershell
# Node.js kontrol et
node --version

# Eğer yüklü değilse: https://nodejs.org/ adresinden indir

# Projeyi kur
git clone https://github.com/cihangirq/dosyatrans.git
cd dosyatrans
npm install
npm start
```

#### macOS

```bash
# Node.js kontrol et
node --version

# Homebrew ile Node.js yükle (gerekirse)
brew install node

# Projeyi kur
git clone https://github.com/cihangirq/dosyatrans.git
cd dosyatrans
npm install
npm start
```

#### Linux

```bash
# Node.js kontrol et
node --version

# nvm ile Node.js yükle (gerekirse)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18

# Projeyi kur
git clone https://github.com/cihangirq/dosyatrans.git
cd dosyatrans
npm install
npm start
```

### Ortam Değişkenleri

`.env` dosyası oluşturun (`.env.example` dosyasından kopyalayabilirsiniz):

```env
# Sunucu portu
PORT=3001

# Güvenlik token'ı (DEĞİŞTİRİN!)
AUTH_TOKEN=benim-gizli-tokenum-123

# İzin verilen yollar (opsiyonel, boş = tüm yollar)
ALLOWED_PATHS=C:\Projects;D:\Work

# Engellenen yollar (opsiyonel)
BLOCKED_PATHS=C:\Windows;C:\System

# Maksimum dosya boyutu (bytes)
MAX_FILE_SIZE=10485760
```

---

## Kullanım

### AI Asistanı ile Kullanım

AI asistanınıza (örneğin ChatGPT veya Claude) şu şekilde istekte bulunabilirsiniz:

```
"Tunnel URL: https://abc123.ngrok.io
Token: dosyatrans-secure-token-2024

C:\Projeler\MyApp klasöründeki projeyi analiz eder misin?"
```

AI asistanı:
1. Tunnel üzerinden bağlanır
2. Belirtilen klasörü analiz eder
3. Sonuçları size sunar

### Doğrudan WebSocket Bağlantısı

```javascript
import { io } from 'socket.io-client';

const socket = io('https://your-tunnel.ngrok.io');

// Kimlik doğrulama
socket.emit('auth', { token: 'dosyatrans-secure-token-2024' });

// Dosya listesi al
socket.emit('fs:list', { path: 'C:\\Projects' });

// Sonuçları dinle
socket.on('fs:list:result', (data) => {
  console.log('Files:', data.items);
});
```

---

## Güvenlik

### ⚠️ Önemli Uyarılar

1. **Token'ı Değiştirin!**
   Varsayılan token güvenli değildir. Mutlaka değiştirin.

2. **Tunnel'ı Kapatın**
   Kullanmadığınızda tunnel'ı kapatın.

3. **Güvenilir AI ile Çalışın**
   Sadece güvendiğiniz AI asistanlarına erişim verin.

4. **Klasör Kısıtlamaları Kullanın**
   Hassas klasörlere erişimi engelleyin.

### Token Değiştirme

```bash
# Ortam değişkeni ile
AUTH_TOKEN="cok-gizli-token-456" npm start

# Veya .env dosyasında
echo "AUTH_TOKEN=cok-gizli-token-456" > .env
npm start
```

### Klasör Erişim Kısıtlamaları

```env
# Sadece belirli klasörlere erişim
ALLOWED_PATHS=C:\Projects;D:\Work

# Belirli klasörleri engelle
BLOCKED_PATHS=C:\Windows;C:\Users\Admin
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

#### Auth
```javascript
// İstek
socket.emit('auth', { token: 'your-token' });

// Başarılı yanıt
socket.on('auth:success', (data) => {
  // data: { platform, rootPath, drives, serverVersion }
});

// Başarısız yanıt
socket.on('auth:failed', (data) => {
  // data: { error }
});
```

#### List Directory
```javascript
socket.emit('fs:list', { path: 'C:\\Projects' });
socket.on('fs:list:result', (data) => {
  // data: { path, items[], totalItems }
});
```

#### Read File
```javascript
socket.emit('fs:read', { 
  path: 'C:\\Projects\\file.txt',
  encoding: 'utf8',
  startLine: 1,    // Opsiyonel
  endLine: 100     // Opsiyonel
});
socket.on('fs:read:result', (data) => {
  // data: { path, content, size, encoding }
});
```

#### Write File
```javascript
socket.emit('fs:write', { 
  path: 'C:\\Projects\\new.txt',
  content: 'Hello World',
  mode: 'write' // veya 'append'
});
socket.on('fs:write:result', (data) => {
  // data: { path, size, success }
});
```

#### Search
```javascript
socket.emit('fs:search', { 
  path: 'C:\\Projects',
  pattern: 'test',
  fileType: '.js',
  maxDepth: 5,
  maxResults: 100
});
socket.on('fs:search:result', (data) => {
  // data: { results[], totalResults }
});
```

#### Analyze Project
```javascript
socket.emit('fs:analyze', { 
  path: 'C:\\Projects\\MyApp',
  depth: 3
});
socket.on('fs:analyze:result', (data) => {
  // data: { projectTypes, files, directories, suggestions }
});
```

---

## Sıkça Sorulan Sorular

### Ngrok bağlantım sürekli kesiliyor?
Ngrok ücretsiz planda bağlantı süresi sınırlıdır. Yeniden başlatın veya ücretli plan kullanın.

### "Path not allowed" hatası alıyorum?
`ALLOWED_PATHS` veya `BLOCKED_PATHS` ayarlarını kontrol edin.

### Birden fazla AI bağlanabilir mi?
Evet, birden fazla istemci aynı anda bağlanabilir.

### Dosya boyutu sınırlaması var mı?
Varsayılan olarak 10MB. `MAX_FILE_SIZE` ile değiştirebilirsiniz.

### Windows dışında çalışır mı?
Evet, macOS ve Linux'ta da çalışır.

---

## Lisans

MIT License - Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing`)
5. Pull Request açın

---

## İletişim

Sorularınız için GitHub Issues kullanabilirsiniz.

---

**Made with ❤️ for AI-Human Collaboration**
