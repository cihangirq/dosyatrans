/**
 * DOSYATRANS v3.0 - Uzaktan Gelistirme Baglanti Araci
 *
 * Bu arac, VS Code Live Share benzeri bir uzaktan gelistirme ortami saglar.
 * Kullanicinin bilgisayarina baglanarak pair-programming yapmanizi saglar.
 *
 * Kullanim:
 *   npm install socket.io-client
 *   node baglan.js <tunnel-url> <token>
 *
 * Ornek:
 *   node baglan.js https://xxx.trycloudflare.com dosyatrans-secure-token-2024
 */

const { io } = require('socket.io-client');

// Parametreleri al
const url = process.argv[2];
const token = process.argv[3];

if (!url || !token) {
  console.log('');
  console.log('  DOSYATRANS v3.0 - Uzaktan Gelistirme Araci');
  console.log('  ==========================================');
  console.log('');
  console.log('  Kullanim: node baglan.js <tunnel-url> <token>');
  console.log('');
  console.log('  Ornek:');
  console.log('    node baglan.js https://xxx.trycloudflare.com dosyatrans-secure-token-2024');
  console.log('');
  process.exit(1);
}

console.log('');
console.log('  DOSYATRANS v3.0 - Uzaktan Gelistirme Araci');
console.log('  ==========================================');
console.log('');
console.log('  Baglaniyor: ' + url);

const socket = io(url, {
  auth: { token: token },
  transports: ['websocket', 'polling'],
  timeout: 15000,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
});

// Baglanti basarili
socket.on('connect', () => {
  console.log('  Durum: Baglandi (ID: ' + socket.id + ')');
  socket.emit('auth', { token: token });
});

// Kimlik dogrulama basarili
socket.on('auth:success', (data) => {
  console.log('  Dogrulama: Basarili');
  console.log('  Platform: ' + data.platform);
  console.log('  Surum: ' + data.serverVersion);
  console.log('');
  console.log('  ----------------------------------------');
  console.log('  Uzaktan Gelistirme Ortami Aktif!');
  console.log('  ----------------------------------------');
  console.log('');
  console.log('  Proje: C:\\kodlar\\dosyatrans-main');
  console.log('');
  console.log('  Komutlar:');
  console.log('    s.emit("fs:list",   {path:"..."})           Dosya listesi');
  console.log('    s.emit("fs:read",   {path:"..."})           Dosya oku');
  console.log('    s.emit("fs:write",  {path:"...",content:"."}) Dosya yaz');
  console.log('    s.emit("fs:edit",   {path:"...",edits:[..]}) Dosya duzenle');
  console.log('    s.emit("fs:delete", {path:"..."})           Dosya sil');
  console.log('    s.emit("fs:mkdir",  {path:"..."})           Klasor olustur');
  console.log('    s.emit("fs:search", {path:"...",pattern:"."}) Dosya ara');
  console.log('    s.emit("fs:copy",   {source:".",destination:"."}) Kopyala');
  console.log('    s.emit("fs:move",   {source:".",destination:"."}) Tasi');
  console.log('    s.emit("fs:rename", {path:"...",newName:"."}) Yeniden adlandir');
  console.log('    s.emit("fs:stat",   {path:"..."})           Dosya bilgisi');
  console.log('    s.emit("fs:exists", {path:"..."})           Varlik kontrolu');
  console.log('    s.emit("fs:analyze",{path:"..."})           Proje analizi');
  console.log('    s.emit("fs:drives", {})                     Surucu listesi');
  console.log('    s.emit("fs:batch",  {operations:[..]})      Toplu islem');
  console.log('    s.emit("terminal:execute", {command:"."})   Terminal komutu');
  console.log('');
  console.log('  Cevap: s.on("KOMUT:result", (d) => {...})');
  console.log('  Hata:  s.on("KOMUT:error",  (d) => {...})');
  console.log('');
  console.log('  Test talimatlari:');
  console.log('    s.emit("fs:read",{path:"C:\\\\kodlar\\\\dosyatrans-main\\\\ai-icin\\\\AI-TAM-BILGI.txt"})');
  console.log('');

  // Otomatik olarak proje dosyalarini listele
  socket.emit('fs:list', { path: 'C:\\kodlar\\dosyatrans-main' });
});

// Proje dosyalari listesi
socket.on('fs:list:result', (data) => {
  if (data.path.includes('dosyatrans-main')) {
    console.log('  PROJE DOSYALARI (' + data.path + '):');
    data.items.forEach(item => {
      const icon = item.isDirectory ? '[DIR]' : '[FILE]';
      const size = item.isFile ? ' (' + item.size + ' byte)' : '';
      console.log('    ' + icon + ' ' + item.name + size);
    });
    console.log('');
    console.log('  Hazir! Test ve gelistirmeye baslayabilirsin.');
    console.log('');
  }
});

// Kimlik dogrulama basarisiz
socket.on('auth:failed', (data) => {
  console.log('  Dogrulama HATASI: ' + data.error);
});

// Baglanti hatasi
socket.on('connect_error', (err) => {
  console.log('  Baglanti HATASI: ' + err.message);
  console.log('  Tunnel calisiyor mu? URL dogru mu?');
});

// Baglanti kesildi
socket.on('disconnect', (reason) => {
  console.log('  Baglanti kesildi: ' + reason);
});

// Yeniden baglaniyor
socket.on('reconnect', (attempt) => {
  console.log('  Yeniden baglandi (deneme: ' + attempt + ')');
});

socket.on('reconnect_error', (err) => {
  console.log('  Yeniden baglanma hatasi: ' + err.message);
});

// Global degisken olarak erisim kolayligi
global.s = socket;

// Keep-alive ping
setInterval(() => {
  if (socket.connected) {
    socket.emit('ping');
  }
}, 30000);
