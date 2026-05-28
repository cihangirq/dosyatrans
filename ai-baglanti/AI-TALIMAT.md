# DOSYATRANS v3.0 - AI ICIN TALIMAT

Bu dosya AI asistana verilecek talimattir.
AI bu talimatlari izleyerek kullanıcının bilgisayarına bağlanır.

---

## ADIM 1: BAGLANTI BILGILERINI AL

Kullanici sana sunlari verecek:
- **Tunnel URL**: `https://xxx-xxx-xxx.trycloudflare.com`
- **Token**: `dosyatrans-secure-token-2024` (veya farkli bir token)

---

## ADIM 2: BAGLANTI KODUNU CALISTIR

Asagidaki kodu calistir:

```bash
cd ai-baglanti && node baglan.js https://TUNNEL_URL TOKEN
```

Ornek:
```bash
cd ai-baglanti && node baglan.js https://rolling-treasury-analog-film.trycloudflare.com dosyatrans-secure-token-2024
```

---

## ADIM 3: DOSYA ISLEMLERI YAP

Baglanti kurulduktan sonra asagidaki fonksiyonlari kullanabilirsin:

### Klasor Listeleme
```javascript
const dosyatrans = require('./ai-baglanti/baglan');
await dosyatrans.listDir('C:\\kodlar');
```

### Dosya Okuma
```javascript
await dosyatrans.readFile('C:\\kodlar\\proje\\server.js');
```

### Dosya Yazma
```javascript
await dosyatrans.writeFile('C:\\kodlar\\proje\\test.txt', 'Merhaba Dunya!');
```

### Dosya Duzenleme (Find & Replace)
```javascript
await dosyatrans.editFile('C:\\kodlar\\proje\\index.js', [
  { oldText: 'eski kod', newText: 'yeni kod' }
]);
```

### Terminal Komutu Calistirma
```javascript
await dosyatrans.executeCommand('npm install', 'C:\\kodlar\\proje');
```

### Proje Analizi
```javascript
await dosyatrans.analyzeProject('C:\\kodlar\\proje');
```

### Dosya Arama
```javascript
await dosyatrans.searchFiles('C:\\kodlar', { pattern: 'server', fileType: '.js' });
```

### Dosya Kopyalama / Tasima
```javascript
await dosyatrans.copyFile('C:\\kaynak.txt', 'D:\\hedef.txt');
await dosyatrans.moveFile('C:\\dosya.txt', 'D:\\dosya.txt');
```

### Batch (Coklu) Islem
```javascript
await dosyatrans.batchOperations([
  { type: 'read', path: 'C:\\proje\\package.json' },
  { type: 'write', path: 'C:\\proje\\test.txt', content: 'test' },
  { type: 'mkdir', path: 'C:\\proje\\yeni-klasor' }
]);
```

---

## TUM FONKSIYONLAR

| Fonksiyon | Aciklama |
|-----------|----------|
| `listDir(path)` | Klasor icerigini listele |
| `readFile(path, options)` | Dosya oku |
| `writeFile(path, content, mode)` | Dosya yaz (`mode`: 'write' veya 'append') |
| `deletePath(path, recursive)` | Dosya/dizin sil |
| `makeDir(path)` | Klasor olustur |
| `searchFiles(path, options)` | Dosya ara (`pattern`, `fileType`, `maxDepth`) |
| `copyFile(source, dest)` | Dosya kopyala |
| `moveFile(source, dest)` | Dosya tasi |
| `renamePath(path, newName)` | Yeniden adlandir |
| `getStats(path)` | Dosya detaylari |
| `editFile(path, edits)` | Dosya duzenle (find & replace) |
| `analyzeProject(path, depth)` | Proje analizi |
| `executeCommand(cmd, cwd, timeout)` | Terminal komutu calistir |
| `batchOperations(ops)` | Coklu islem |
| `pathExists(path)` | Varlik kontrolu |
| `listDrives()` | Suruculeri listele |

---

## ONEMLI NOTLAR

1. **Her islem async/await kullanir** - Promise dondurur
2. **Token dogrulamasi zorunludur** - Yanlis token = baglanti reddedilir
3. **Tunnel URL her oturumda degisir** - Kullanicidan guncel URL'yi al
4. **Windows yollari backslash kullanir** - `C:\\Users\\...` veya `C:/Users/...`
5. **Buyuk dosyalar icin stream kullanin** - 10MB ustu dosyalar hata verebilir

---

## HIZLI TEST

Baglantiyi test etmek icin:

```bash
cd ai-baglanti && node baglan.js https://TUNNEL_URL TOKEN
```

Basarili baglantida sunlari gorursunuz:
```
Baglandi! ID: xxx
Dogrulandi! Platform: win32 | Root: C:\
Hazir! Komutlar icin API dokumanina bakin.
```
