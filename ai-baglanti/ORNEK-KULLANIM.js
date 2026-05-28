/**
 * DOSYATRANS v3.0 - AI icin Ornek Kullanim
 * 
 * AI asistan bu dosyayi calistirarak
 * bilgisayarinizdaki dosyalara erisebilir.
 */

const dosyatrans = require('./baglan');

// Ayarlari gir (veya komut satirindan al)
const TUNNEL_URL = process.argv[2];
const AUTH_TOKEN = process.argv[3] || 'dosyatrans-secure-token-2024';

// ──────────────────────────────────────────────────────────────
// ORNEK 1: Klasor listeleme
// ──────────────────────────────────────────────────────────────
async function ornekListele() {
  try {
    const sonuc = await dosyatrans.listDir('C:\\kodlar');
    console.log('Klasor icerigi:');
    sonuc.items.forEach(item => {
      console.log(item.isDirectory ? '[DIR]' : '[FILE]', item.name);
    });
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}

// ──────────────────────────────────────────────────────────────
// ORNEK 2: Dosya okuma
// ──────────────────────────────────────────────────────────────
async function ornekDosyaOku() {
  try {
    const sonuc = await dosyatrans.readFile('C:\\kodlar\\proje\\package.json');
    console.log('Dosya icerigi:', sonuc.content);
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}

// ──────────────────────────────────────────────────────────────
// ORNEK 3: Dosya yazma
// ──────────────────────────────────────────────────────────────
async function ornekDosyaYaz() {
  try {
    const sonuc = await dosyatrans.writeFile(
      'C:\\kodlar\\proje\\test.txt',
      'Merhaba! Bu dosyayi AI yazdi.'
    );
    console.log('Yazildi:', sonuc);
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}

// ──────────────────────────────────────────────────────────────
// ORNEK 4: Terminal komutu calistirma
// ──────────────────────────────────────────────────────────────
async function ornekTerminal() {
  try {
    const sonuc = await dosyatrans.executeCommand('dir C:\\kodlar');
    console.log('Cikti:', sonuc.stdout);
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}

// ──────────────────────────────────────────────────────────────
// ORNEK 5: Proje analizi
// ──────────────────────────────────────────────────────────────
async function ornekAnaliz() {
  try {
    const sonuc = await dosyatrans.analyzeProject('C:\\kodlar\\proje');
    console.log('Proje turu:', sonuc.projectTypes);
    console.log('Dosya sayisi:', sonuc.files.total);
    console.log('Bagimliliklar:', Object.keys(sonuc.dependencies));
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}

// ──────────────────────────────────────────────────────────────
// ORNEK 6: Dosya duzenleme (find & replace)
// ──────────────────────────────────────────────────────────────
async function ornekDuzenle() {
  try {
    const sonuc = await dosyatrans.editFile('C:\\kodlar\\proje\\index.js', [
      { oldText: 'console.log("eski")', newText: 'console.log("yeni")' }
    ]);
    console.log('Duzenlenen:', sonuc.editsApplied, 'yer');
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}

// ──────────────────────────────────────────────────────────────
// ORNEK 7: Batch islem (birden fazla islem tek seferde)
// ──────────────────────────────────────────────────────────────
async function ornekBatch() {
  try {
    const sonuc = await dosyatrans.batchOperations([
      { type: 'read', path: 'C:\\kodlar\\proje\\package.json' },
      { type: 'read', path: 'C:\\kodlar\\proje\\README.md' },
      { type: 'mkdir', path: 'C:\\kodlar\\proje\\yeni-klasor' },
    ]);
    console.log('Basarili:', sonuc.successful, '/', sonuc.totalOperations);
  } catch (hata) {
    console.error('Hata:', hata.message);
  }
}
