/**
 * DOSYATRANS v3.0 - AI Baglanti Scripti
 * 
 * Bu dosyayi AI asistan calistirir ve bilgisayarinizdaki
 * dosyalara uzaktan erisim saglar.
 * 
 * KULLANIM:
 *   node baglan.js <TUNNEL_URL> <TOKEN>
 *   
 * ORNEK:
 *   node baglan.js https://abc.trycloudflare.com dosyatrans-secure-token-2024
 */

const io = require('socket.io-client');

// ═══════════════════════════════════════════════════════════════
// AYARLAR
// ═══════════════════════════════════════════════════════════════

const TUNNEL_URL = process.argv[2];
const AUTH_TOKEN = process.argv[3] || 'dosyatrans-secure-token-2024';

if (!TUNNEL_URL) {
  console.error('HATA: Tunnel URL gerekli!');
  console.error('Kullanim: node baglan.js <TUNNEL_URL> <TOKEN>');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════
// BAGLANTI
// ═══════════════════════════════════════════════════════════════

const socket = io(TUNNEL_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 20,
  timeout: 15000
});

let isAuthenticated = false;
let serverInfo = null;

socket.on('connect', () => {
  console.log('Baglandi! ID:', socket.id);
  socket.emit('auth', { token: AUTH_TOKEN, clientInfo: 'AI-Assistant' });
});

socket.on('auth:success', (data) => {
  isAuthenticated = true;
  serverInfo = data;
  console.log('Dogrulandi! Platform:', data.platform, '| Root:', data.rootPath);
  console.log('Hazir! Komutlar icin API dokumanina bakin.');
});

socket.on('auth:failed', (data) => {
  console.error('Dogrulama basarisiz:', data.error);
});

socket.on('disconnect', () => {
  isAuthenticated = false;
  console.log('Baglanti kesildi. Yeniden baglaniyor...');
});

// ═══════════════════════════════════════════════════════════════
// DOSYA ISLEMLERI API
// ═══════════════════════════════════════════════════════════════

/**
 * Dizin listele
 * @param {string} dirPath - Dizin yolu
 * @returns {Promise<object>} - Dizin icerigi
 */
function listDir(dirPath) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:list', { path: dirPath });
    socket.once('fs:list:result', resolve);
    socket.once('fs:list:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya oku
 * @param {string} filePath - Dosya yolu
 * @param {object} options - {encoding, startLine, endLine}
 * @returns {Promise<object>} - Dosya icerigi
 */
function readFile(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:read', { path: filePath, ...options });
    socket.once('fs:read:result', resolve);
    socket.once('fs:read:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya yaz
 * @param {string} filePath - Dosya yolu
 * @param {string} content - Icerik
 * @param {string} mode - 'write' veya 'append'
 * @returns {Promise<object>} - Sonuc
 */
function writeFile(filePath, content, mode = 'write') {
  return new Promise((resolve, reject) => {
    socket.emit('fs:write', { path: filePath, content, mode });
    socket.once('fs:write:result', resolve);
    socket.once('fs:write:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya/dizin sil
 * @param {string} targetPath - Silinecek yol
 * @param {boolean} recursive - Alt dizinlerle birlikte
 * @returns {Promise<object>} - Sonuc
 */
function deletePath(targetPath, recursive = false) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:delete', { path: targetPath, recursive });
    socket.once('fs:delete:result', resolve);
    socket.once('fs:delete:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dizin olustur
 * @param {string} dirPath - Dizin yolu
 * @returns {Promise<object>} - Sonuc
 */
function makeDir(dirPath) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:mkdir', { path: dirPath });
    socket.once('fs:mkdir:result', resolve);
    socket.once('fs:mkdir:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya arama
 * @param {string} searchPath - Arama dizini
 * @param {object} options - {pattern, fileType, maxDepth, maxResults}
 * @returns {Promise<object>} - Sonuclar
 */
function searchFiles(searchPath, options = {}) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:search', { path: searchPath, ...options });
    socket.once('fs:search:result', resolve);
    socket.once('fs:search:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 30000);
  });
}

/**
 * Dosya kopyala
 */
function copyFile(source, destination) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:copy', { source, destination });
    socket.once('fs:copy:result', resolve);
    socket.once('fs:copy:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya tasi
 */
function moveFile(source, destination) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:move', { source, destination });
    socket.once('fs:move:result', resolve);
    socket.once('fs:move:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya yeniden adlandir
 */
function renamePath(oldPath, newName) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:rename', { path: oldPath, newName });
    socket.once('fs:rename:result', resolve);
    socket.once('fs:rename:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya detaylari
 */
function getStats(targetPath) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:stat', { path: targetPath });
    socket.once('fs:stat:result', resolve);
    socket.once('fs:stat:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Dosya duzenle (find & replace)
 * @param {string} filePath - Dosya yolu
 * @param {Array} edits - [{oldText, newText}, ...]
 * @returns {Promise<object>} - Sonuc
 */
function editFile(filePath, edits) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:edit', { path: filePath, edits });
    socket.once('fs:edit:result', resolve);
    socket.once('fs:edit:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Proje analizi
 */
function analyzeProject(projectPath, depth = 3) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:analyze', { path: projectPath, depth });
    socket.once('fs:analyze:result', resolve);
    socket.once('fs:analyze:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 30000);
  });
}

/**
 * Terminal komutu calistir
 * @param {string} command - Komut
 * @param {string} cwd - Calisma dizini
 * @param {number} timeout - Zaman asimi (ms)
 * @returns {Promise<object>} - {stdout, stderr, exitCode}
 */
function executeCommand(command, cwd, timeout = 30000) {
  return new Promise((resolve, reject) => {
    socket.emit('terminal:execute', { command, cwd, timeout });
    socket.once('terminal:execute:result', resolve);
    socket.once('terminal:execute:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), timeout + 5000);
  });
}

/**
 * Batch (coklu) islem
 * @param {Array} operations - [{type, path, content, ...}, ...]
 * @returns {Promise<object>} - Sonuclar
 */
function batchOperations(operations) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:batch', { operations });
    socket.once('fs:batch:result', resolve);
    socket.once('fs:batch:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 30000);
  });
}

/**
 * Dosya varlik kontrolu
 */
function pathExists(checkPath) {
  return new Promise((resolve, reject) => {
    socket.emit('fs:exists', { path: checkPath });
    socket.once('fs:exists:result', resolve);
    socket.once('fs:exists:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

/**
 * Suruculeri listele
 */
function listDrives() {
  return new Promise((resolve, reject) => {
    socket.emit('fs:drives');
    socket.once('fs:drives:result', resolve);
    socket.once('fs:drives:error', (err) => reject(new Error(err.error)));
    setTimeout(() => reject(new Error('Timeout')), 15000);
  });
}

// ═══════════════════════════════════════════════════════════════
// EXPORT - AI bunlari kullanir
// ═══════════════════════════════════════════════════════════════

module.exports = {
  socket,
  listDir,
  readFile,
  writeFile,
  deletePath,
  makeDir,
  searchFiles,
  copyFile,
  moveFile,
  renamePath,
  getStats,
  editFile,
  analyzeProject,
  executeCommand,
  batchOperations,
  pathExists,
  listDrives,
  // Yardimcilar
  isConnected: () => isAuthenticated,
  getServerInfo: () => serverInfo,
  getTunnelUrl: () => TUNNEL_URL,
};

// ═══════════════════════════════════════════════════════════════
// INTERAKTIF MOD - Direkt calistirilirsa
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  console.log('DOSYATRANS v3.0 - AI Baglanti Scripti');
  console.log('URL:', TUNNEL_URL);
  console.log('Token:', AUTH_TOKEN);
  console.log('Baglanti bekleniyor...\n');
  
  socket.on('auth:success', async (data) => {
    try {
      // Demo: Suruculeri listele
      console.log('\n--- SURUCULER ---');
      const drives = await listDrives();
      drives.drives.forEach(d => console.log(' ', d.name));
      
      // Demo: Root dizini listele
      console.log('\n--- ROOT DIZIN ---');
      const root = await listDir(data.rootPath);
      root.items.slice(0, 10).forEach(item => {
        console.log(item.isDirectory ? '  [DIR]' : '  [FILE]', item.name);
      });
      
      console.log('\nBaglanti basarili! AI komutlari hazir.');
      console.log('Bu scripti require() ile baska bir dosyadan kullanabilirsiniz.');
      
    } catch (err) {
      console.error('Demo hatasi:', err.message);
    }
  });
}
