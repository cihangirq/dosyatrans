/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           DOSYATRANS v3.0                                ║
 * ║                     AI File Bridge Server                                ║
 * ║                                                                           ║
 * ║  Bu sunucu bilgisayarinizdaki dosyalara uzaktan erisim saglar.           ║
 * ║  AI asistaninizin dosya okuma, yazma, analiz islemlerini                 ║
 * ║  gerceklestirmesine olanak tanir.                                        ║
 * ║                                                                           ║
 * ║  v3.0 Yenilikler:                                                        ║
 * ║  - Cloudflared otomatik baslatma ve tunnel URL algilama                  ║
 * ║  - Web arayuzu otomatik servis ediliyor                                   ║
 * ║  - Terminal komut calistirma (resolveShell ile PATH fix)                  ║
 * ║  - Dosya batch/edit/stream islemleri                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * KULLANIM:
 *   baslat.bat    - Her seyi otomatik baslat
 *   npm install   - Bagimliliklari yukle
 *   npm start     - Sunucuyu baslat
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const mime = require('mime-types');

// ═══════════════════════════════════════════════════════════════════════════
// KONFIGURASYON
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  PORT: process.env.PORT || 3001,
  AUTH_TOKEN: process.env.AUTH_TOKEN || 'dosyatrans-secure-token-2024',
  PLATFORM: process.platform,
  ROOT_PATH: process.platform === 'win32' 
    ? process.cwd().split(path.sep)[0] + path.sep 
    : '/',
  ALLOWED_PATHS: process.env.ALLOWED_PATHS 
    ? process.env.ALLOWED_PATHS.split(';') 
    : [],
  BLOCKED_PATHS: process.env.BLOCKED_PATHS 
    ? process.env.BLOCKED_PATHS.split(';') 
    : [],
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
  AUTO_START_CLOUDFLARED: process.env.AUTO_START_CLOUDFLARED !== 'false',
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPRESS & SOCKET.IO KURULUMU
// ═══════════════════════════════════════════════════════════════════════════

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 50e6
});

// Bagli istemciler
const connectedClients = new Map();

// Tunnel URL (cloudflared'dan alinir)
let tunnelUrl = null;

// ═══════════════════════════════════════════════════════════════════════════
// YARDIMCI FONKSIYONLAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Token dogrulama
 */
function validateToken(token) {
  return token === CONFIG.AUTH_TOKEN;
}

/**
 * Yol guvenlik kontrolu
 */
function isPathAllowed(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    
    for (const blocked of CONFIG.BLOCKED_PATHS) {
      if (resolved.toLowerCase().startsWith(blocked.toLowerCase())) {
        return false;
      }
    }
    
    if (CONFIG.ALLOWED_PATHS.length === 0) return true;
    
    for (const allowed of CONFIG.ALLOWED_PATHS) {
      if (resolved.toLowerCase().startsWith(allowed.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Dosya/Dizin bilgisi al
 */
function getStats(itemPath) {
  try {
    const stats = fs.statSync(itemPath);
    return {
      name: path.basename(itemPath),
      path: itemPath,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      permissions: stats.mode
    };
  } catch (error) {
    return null;
  }
}

/**
 * Suruculeri listele
 */
function getDrives() {
  if (CONFIG.PLATFORM === 'win32') {
    const drives = [];
    for (let letter = 65; letter <= 90; letter++) {
      const drive = String.fromCharCode(letter) + ':\\';
      try {
        fs.accessSync(drive, fs.constants.R_OK);
        drives.push({ name: drive, path: drive });
      } catch (e) {}
    }
    return drives;
  } else {
    return [{ name: 'Root', path: '/' }];
  }
}

/**
 * Proje turunu algila
 */
function detectProjectType(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    const projectTypes = [];
    
    if (files.some(f => f.startsWith('next.config'))) {
      projectTypes.push('Next.js');
    }
    
    if (files.includes('package.json')) {
      try {
        const pkgPath = path.join(dirPath, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        
        if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          if (!projectTypes.includes('Next.js')) projectTypes.push('Next.js');
        }
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          if (!projectTypes.includes('React')) projectTypes.push('React');
        }
        if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
          if (!projectTypes.includes('Vue.js')) projectTypes.push('Vue.js');
        }
        if (pkg.dependencies?.angular || pkg.devDependencies?.['@angular/core']) {
          if (!projectTypes.includes('Angular')) projectTypes.push('Angular');
        }
        if (!projectTypes.some(t => ['Next.js', 'React', 'Vue.js', 'Angular'].includes(t))) {
          projectTypes.push('Node.js');
        }
      } catch (e) {
        projectTypes.push('Node.js');
      }
    }
    
    if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      projectTypes.push('Python');
    }
    if (files.includes('manage.py')) {
      projectTypes.push('Django');
    }
    if (files.includes('pom.xml')) {
      projectTypes.push('Java/Maven');
    }
    if (files.some(f => f === 'build.gradle' || f === 'build.gradle.kts')) {
      projectTypes.push('Java/Gradle');
    }
    if (files.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
      projectTypes.push('C#/.NET');
    }
    if (files.includes('go.mod')) {
      projectTypes.push('Go');
    }
    if (files.includes('Cargo.toml')) {
      projectTypes.push('Rust');
    }
    if (files.includes('composer.json')) {
      projectTypes.push('PHP');
    }
    if (files.includes('Gemfile')) {
      projectTypes.push('Ruby');
    }
    
    return projectTypes.length > 0 ? projectTypes : ['Unknown'];
  } catch (e) {
    return ['Unknown'];
  }
}

/**
 * Log yazdir
 */
function log(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': 'INFO',
    'success': 'OK',
    'error': 'ERR',
    'warning': 'WARN',
    'connect': 'CONN',
    'disconnect': 'DISC',
    'tunnel': 'TUNNEL'
  }[type] || 'LOG';
  
  console.log(`[${timestamp}] [${prefix}] ${message}`);
  if (details) {
    console.log('   Details:', typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
  }
}

/**
 * Shell yolunu cozumle - Windows PATH sorununu gider
 * cmd.exe veya PowerShell yolunu tam olarak bulur
 */
function resolveShell() {
  if (CONFIG.PLATFORM === 'win32') {
    // PowerShell yolunu bul
    const psPaths = [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe',
      process.env.SystemRoot + '\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    ];
    
    for (const psPath of psPaths) {
      try {
        if (fs.existsSync(psPath)) {
          return { shell: psPath, type: 'powershell' };
        }
      } catch (e) {}
    }
    
    // cmd.exe yolunu bul
    const cmdPaths = [
      'C:\\Windows\\System32\\cmd.exe',
      'C:\\Windows\\SysWOW64\\cmd.exe',
      process.env.SystemRoot + '\\System32\\cmd.exe',
    ];
    
    for (const cmdPath of cmdPaths) {
      try {
        if (fs.existsSync(cmdPath)) {
          return { shell: cmdPath, type: 'cmd' };
        }
      } catch (e) {}
    }
    
    // Fallback
    return { shell: 'powershell.exe', type: 'powershell' };
  } else {
    return { shell: '/bin/bash', type: 'bash' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CLOUDFLARED TUNNEL YONETIMI
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cloudflared tunnel baslat ve URL algila
 */
function startCloudflared() {
  if (!CONFIG.AUTO_START_CLOUDFLARED) {
    log('info', 'Cloudflared otomatik baslatma devre disi');
    return;
  }

  // cloudflared.exe yolunu bul
  const possiblePaths = [
    path.join(__dirname, 'cloudflared.exe'),
    path.join(__dirname, 'cloudflared'),
    'cloudflared',
    'cloudflared.exe'
  ];
  
  let cloudflaredPath = null;
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        cloudflaredPath = p;
        break;
      }
    } catch (e) {}
  }
  
  // Windows'ta PATH'ten de arayalim
  if (!cloudflaredPath && CONFIG.PLATFORM === 'win32') {
    cloudflaredPath = 'cloudflared.exe';
  } else if (!cloudflaredPath) {
    cloudflaredPath = 'cloudflared';
  }

  log('tunnel', `Cloudflared baslatiliyor: ${cloudflaredPath}`);

  try {
    const cloudflared = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${CONFIG.PORT}`], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: CONFIG.PLATFORM === 'win32'
    });

    let urlDetected = false;

    cloudflared.stdout.on('data', (data) => {
      const output = data.toString();
      // Tunnel URL'sini algila
      const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (urlMatch && !urlDetected) {
        tunnelUrl = urlMatch[0];
        urlDetected = true;
        log('tunnel', `Tunnel URL algilandi: ${tunnelUrl}`);
        
        // Tum bagli istemcilere tunnel URL'i gonder
        io.emit('tunnel-url', { url: tunnelUrl, token: CONFIG.AUTH_TOKEN });
      }
    });

    cloudflared.stderr.on('data', (data) => {
      const output = data.toString();
      // cloudflared URL'yi stderr'a da yazabilir
      const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (urlMatch && !urlDetected) {
        tunnelUrl = urlMatch[0];
        urlDetected = true;
        log('tunnel', `Tunnel URL algilandi: ${tunnelUrl}`);
        
        io.emit('tunnel-url', { url: tunnelUrl, token: CONFIG.AUTH_TOKEN });
      }
    });

    cloudflared.on('error', (error) => {
      log('error', `Cloudflared baslatma hatasi: ${error.message}`);
      log('warning', 'Cloudflared baslatilamadi. Manuel tunnel baslatabilirsiniz:');
      log('warning', `  cloudflared tunnel --url http://localhost:${CONFIG.PORT}`);
    });

    cloudflared.on('close', (code) => {
      log('warning', `Cloudflared kapatildi (kod: ${code})`);
      tunnelUrl = null;
    });

    // 10 saniye sonra hala URL algilanmadiysa uyari ver
    setTimeout(() => {
      if (!urlDetected) {
        log('warning', 'Tunnel URL 10 saniye icinde algilanamadi.');
        log('warning', 'Cloudflared henuz baslamamis olabilir veya kurulu degil.');
        log('warning', 'kur.bat calistirarak cloudflared kurabilirsiniz.');
      }
    }, 10000);

  } catch (error) {
    log('error', `Cloudflared baslatma hatasi: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Ana sayfa - Arayuz HTML servis et
app.get('/', (req, res) => {
  const arayuzPath = path.join(__dirname, 'arayuz.html');
  if (fs.existsSync(arayuzPath)) {
    res.sendFile(arayuzPath);
  } else {
    res.json({
      name: 'DOSYATRANS - AI File Bridge Server',
      version: '3.0.0',
      status: 'running',
      platform: CONFIG.PLATFORM,
      port: CONFIG.PORT,
      tunnelUrl: tunnelUrl,
      connectedClients: connectedClients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

// Saglik kontrolu
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    tunnelUrl: tunnelUrl,
    timestamp: new Date().toISOString()
  });
});

// Suruculeri listele (HTTP)
app.get('/drives', (req, res) => {
  res.json({ drives: getDrives() });
});

// Token dogrulama (HTTP)
app.post('/auth', (req, res) => {
  const { token } = req.body;
  if (validateToken(token)) {
    res.json({ 
      success: true, 
      platform: CONFIG.PLATFORM,
      rootPath: CONFIG.ROOT_PATH,
      drives: getDrives(),
      tunnelUrl: tunnelUrl
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// Tunnel URL endpoint (HTTP)
app.get('/tunnel-url', (req, res) => {
  res.json({ 
    url: tunnelUrl, 
    token: CONFIG.AUTH_TOKEN,
    active: tunnelUrl !== null 
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  log('connect', `Yeni baglanti: ${socket.id}`);
  let isAuthenticated = false;
  let clientInfo = {};
  
  // Dogrulanmamis istemciye tunnel URL gonder
  if (tunnelUrl) {
    socket.emit('tunnel-url', { url: tunnelUrl, token: CONFIG.AUTH_TOKEN });
  }
  
  // ═══ AUTH - Kimlik Dogrulama ═══
  socket.on('auth', (data) => {
    if (validateToken(data.token)) {
      isAuthenticated = true;
      clientInfo = {
        id: socket.id,
        connectedAt: new Date(),
        info: data.clientInfo || 'Unknown'
      };
      connectedClients.set(socket.id, clientInfo);
      
      socket.emit('auth:success', {
        platform: CONFIG.PLATFORM,
        rootPath: CONFIG.ROOT_PATH,
        drives: getDrives(),
        serverVersion: '3.0.0',
        socketId: socket.id,
        tunnelUrl: tunnelUrl
      });
      
      log('success', `Kimlik dogrulandi: ${socket.id}`);
    } else {
      socket.emit('auth:failed', { error: 'Invalid token' });
      socket.disconnect();
      log('error', `Kimlik dogrulama basarisiz: ${socket.id}`);
    }
  });
  
  // ═══ LIST - Dizin Listeleme ═══
  socket.on('fs:list', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:list:error', { error: 'Not authenticated' });
    }
    
    const targetPath = data.path || CONFIG.ROOT_PATH;
    
    try {
      if (!isPathAllowed(targetPath)) {
        return socket.emit('fs:list:error', { error: 'Path not allowed', path: targetPath });
      }
      
      if (!fs.existsSync(targetPath)) {
        return socket.emit('fs:list:error', { error: 'Path does not exist', path: targetPath });
      }
      
      const stats = fs.statSync(targetPath);
      if (!stats.isDirectory()) {
        return socket.emit('fs:list:error', { error: 'Not a directory', path: targetPath });
      }
      
      const items = fs.readdirSync(targetPath);
      const fileList = [];
      
      for (const item of items) {
        try {
          const itemPath = path.join(targetPath, item);
          const itemStats = getStats(itemPath);
          if (itemStats) {
            fileList.push(itemStats);
          }
        } catch (e) {}
      }
      
      fileList.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      socket.emit('fs:list:result', {
        path: targetPath,
        items: fileList,
        totalItems: fileList.length,
        timestamp: new Date().toISOString()
      });
      
      log('info', `LIST: ${targetPath} (${fileList.length} items)`);
    } catch (error) {
      socket.emit('fs:list:error', { error: error.message, path: targetPath });
      log('error', `LIST error: ${error.message}`);
    }
  });
  
  // ═══ READ - Dosya Okuma ═══
  socket.on('fs:read', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:read:error', { error: 'Not authenticated' });
    }
    
    const { path: filePath, encoding = 'utf8', startLine, endLine } = data;
    
    try {
      if (!isPathAllowed(filePath)) {
        return socket.emit('fs:read:error', { error: 'Path not allowed', path: filePath });
      }
      
      if (!fs.existsSync(filePath)) {
        return socket.emit('fs:read:error', { error: 'File does not exist', path: filePath });
      }
      
      const fileStats = fs.statSync(filePath);
      
      if (fileStats.isDirectory()) {
        return socket.emit('fs:read:error', { error: 'Cannot read a directory', path: filePath });
      }
      
      if (fileStats.size > CONFIG.MAX_FILE_SIZE) {
        return socket.emit('fs:read:error', { 
          error: `File too large. Max size: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
          path: filePath,
          size: fileStats.size
        });
      }
      
      if (startLine !== undefined && endLine !== undefined) {
        const content = fs.readFileSync(filePath, encoding);
        const lines = content.split('\n');
        const selectedLines = lines.slice(startLine - 1, endLine);
        
        socket.emit('fs:read:result', {
          path: filePath,
          content: selectedLines.join('\n'),
          totalLines: lines.length,
          returnedLines: selectedLines.length,
          startLine,
          endLine,
          size: fileStats.size,
          encoding
        });
      } else {
        const content = fs.readFileSync(filePath, encoding);
        
        socket.emit('fs:read:result', {
          path: filePath,
          content,
          size: fileStats.size,
          encoding,
          mimeType: mime.lookup(filePath) || 'application/octet-stream'
        });
      }
      
      log('info', `READ: ${filePath} (${fileStats.size} bytes)`);
    } catch (error) {
      socket.emit('fs:read:error', { error: error.message, path: filePath });
      log('error', `READ error: ${error.message}`);
    }
  });
  
  // ═══ WRITE - Dosya Yazma ═══
  socket.on('fs:write', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:write:error', { error: 'Not authenticated' });
    }
    
    const { path: filePath, content, encoding = 'utf8', mode = 'write' } = data;
    
    try {
      if (!isPathAllowed(filePath)) {
        return socket.emit('fs:write:error', { error: 'Path not allowed', path: filePath });
      }
      
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (mode === 'append') {
        fs.appendFileSync(filePath, content, encoding);
      } else {
        fs.writeFileSync(filePath, content, encoding);
      }
      
      const fileStats = fs.statSync(filePath);
      
      socket.emit('fs:write:result', {
        path: filePath,
        size: fileStats.size,
        mode,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `WRITE: ${filePath} (${fileStats.size} bytes, mode: ${mode})`);
    } catch (error) {
      socket.emit('fs:write:error', { error: error.message, path: filePath });
      log('error', `WRITE error: ${error.message}`);
    }
  });
  
  // ═══ DELETE - Dosya/Dizin Silme ═══
  socket.on('fs:delete', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:delete:error', { error: 'Not authenticated' });
    }
    
    const { path: targetPath, recursive = false } = data;
    
    try {
      if (!isPathAllowed(targetPath)) {
        return socket.emit('fs:delete:error', { error: 'Path not allowed', path: targetPath });
      }
      
      if (!fs.existsSync(targetPath)) {
        return socket.emit('fs:delete:error', { error: 'Path does not exist', path: targetPath });
      }
      
      const delStats = fs.statSync(targetPath);
      
      if (delStats.isDirectory()) {
        if (recursive) {
          fs.rmSync(targetPath, { recursive: true });
        } else {
          fs.rmdirSync(targetPath);
        }
      } else {
        fs.unlinkSync(targetPath);
      }
      
      socket.emit('fs:delete:result', {
        path: targetPath,
        wasDirectory: delStats.isDirectory(),
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `DELETE: ${targetPath}`);
    } catch (error) {
      socket.emit('fs:delete:error', { error: error.message, path: targetPath });
      log('error', `DELETE error: ${error.message}`);
    }
  });
  
  // ═══ MKDIR - Dizin Olusturma ═══
  socket.on('fs:mkdir', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:mkdir:error', { error: 'Not authenticated' });
    }
    
    const { path: dirPath, recursive = true } = data;
    
    try {
      if (!isPathAllowed(dirPath)) {
        return socket.emit('fs:mkdir:error', { error: 'Path not allowed', path: dirPath });
      }
      
      fs.mkdirSync(dirPath, { recursive });
      
      socket.emit('fs:mkdir:result', {
        path: dirPath,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `MKDIR: ${dirPath}`);
    } catch (error) {
      socket.emit('fs:mkdir:error', { error: error.message, path: dirPath });
      log('error', `MKDIR error: ${error.message}`);
    }
  });
  
  // ═══ STAT - Dosya Detaylari ═══
  socket.on('fs:stat', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:stat:error', { error: 'Not authenticated' });
    }
    
    const { path: targetPath } = data;
    
    try {
      if (!isPathAllowed(targetPath)) {
        return socket.emit('fs:stat:error', { error: 'Path not allowed' });
      }
      
      const statsResult = getStats(targetPath);
      
      if (!statsResult) {
        return socket.emit('fs:stat:error', { error: 'Path not found' });
      }
      
      socket.emit('fs:stat:result', statsResult);
    } catch (error) {
      socket.emit('fs:stat:error', { error: error.message });
    }
  });
  
  // ═══ RENAME - Dosya Yeniden Adlandirma ═══
  socket.on('fs:rename', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:rename:error', { error: 'Not authenticated' });
    }
    
    const { path: oldPath, newName } = data;
    
    try {
      if (!isPathAllowed(oldPath)) {
        return socket.emit('fs:rename:error', { error: 'Path not allowed' });
      }
      
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, newName);
      
      fs.renameSync(oldPath, newPath);
      
      socket.emit('fs:rename:result', {
        oldPath,
        newPath,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `RENAME: ${oldPath} -> ${newPath}`);
    } catch (error) {
      socket.emit('fs:rename:error', { error: error.message });
      log('error', `RENAME error: ${error.message}`);
    }
  });
  
  // ═══ COPY - Dosya Kopyalama ═══
  socket.on('fs:copy', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:copy:error', { error: 'Not authenticated' });
    }
    
    const { source, destination } = data;
    
    try {
      if (!isPathAllowed(source) || !isPathAllowed(destination)) {
        return socket.emit('fs:copy:error', { error: 'Path not allowed' });
      }
      
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFileSync(source, destination);
      
      socket.emit('fs:copy:result', {
        source,
        destination,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `COPY: ${source} -> ${destination}`);
    } catch (error) {
      socket.emit('fs:copy:error', { error: error.message });
      log('error', `COPY error: ${error.message}`);
    }
  });
  
  // ═══ MOVE - Dosya Tasima ═══
  socket.on('fs:move', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:move:error', { error: 'Not authenticated' });
    }
    
    const { source, destination } = data;
    
    try {
      if (!isPathAllowed(source) || !isPathAllowed(destination)) {
        return socket.emit('fs:move:error', { error: 'Path not allowed' });
      }
      
      const destDir = path.dirname(destination);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.renameSync(source, destination);
      
      socket.emit('fs:move:result', {
        source,
        destination,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `MOVE: ${source} -> ${destination}`);
    } catch (error) {
      socket.emit('fs:move:error', { error: error.message });
      log('error', `MOVE error: ${error.message}`);
    }
  });
  
  // ═══ SEARCH - Dosya Arama ═══
  socket.on('fs:search', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:search:error', { error: 'Not authenticated' });
    }
    
    const { 
      path: searchPath, 
      pattern, 
      fileType, 
      maxDepth = 5,
      maxResults = 100,
      includeHidden = false
    } = data;
    
    try {
      if (!isPathAllowed(searchPath)) {
        return socket.emit('fs:search:error', { error: 'Path not allowed', path: searchPath });
      }
      
      if (!fs.existsSync(searchPath)) {
        return socket.emit('fs:search:error', { error: 'Path does not exist', path: searchPath });
      }
      
      const results = [];
      let searchCount = 0;
      
      function searchDir(dirPath, depth) {
        if (depth > maxDepth || searchCount >= maxResults) return;
        
        try {
          const items = fs.readdirSync(dirPath);
          
          for (const item of items) {
            if (searchCount >= maxResults) break;
            
            if (!includeHidden && item.startsWith('.')) continue;
            if (item === 'node_modules' || item === '__pycache__' || item === '.git') continue;
            
            const itemPath = path.join(dirPath, item);
            const itemStats = getStats(itemPath);
            
            if (!itemStats) continue;
            
            const nameMatch = pattern ? 
              item.toLowerCase().includes(pattern.toLowerCase()) : true;
            
            const typeMatch = fileType ? 
              item.toLowerCase().endsWith(fileType.toLowerCase()) : true;
            
            if (nameMatch && typeMatch) {
              results.push(itemStats);
              searchCount++;
            }
            
            if (itemStats.isDirectory && depth < maxDepth) {
              searchDir(itemPath, depth + 1);
            }
          }
        } catch (e) {}
      }
      
      searchDir(searchPath, 0);
      
      socket.emit('fs:search:result', {
        path: searchPath,
        pattern,
        fileType,
        results,
        totalResults: results.length,
        timestamp: new Date().toISOString()
      });
      
      log('info', `SEARCH: "${pattern || '*'}" in ${searchPath} (${results.length} results)`);
    } catch (error) {
      socket.emit('fs:search:error', { error: error.message, path: searchPath });
      log('error', `SEARCH error: ${error.message}`);
    }
  });
  
  // ═══ EDIT - Dosya Duzenleme ═══
  socket.on('fs:edit', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:edit:error', { error: 'Not authenticated' });
    }
    
    const { path: filePath, edits, encoding = 'utf8' } = data;
    
    try {
      if (!isPathAllowed(filePath)) {
        return socket.emit('fs:edit:error', { error: 'Path not allowed', path: filePath });
      }
      
      if (!fs.existsSync(filePath)) {
        return socket.emit('fs:edit:error', { error: 'File does not exist', path: filePath });
      }
      
      let content = fs.readFileSync(filePath, encoding);
      let editCount = 0;
      
      if (Array.isArray(edits)) {
        for (const edit of edits) {
          if (content.includes(edit.oldText)) {
            content = content.replace(edit.oldText, edit.newText);
            editCount++;
          }
        }
      } else if (edits.oldText && edits.newText) {
        if (content.includes(edits.oldText)) {
          content = content.replace(edits.oldText, edits.newText);
          editCount++;
        }
      }
      
      fs.writeFileSync(filePath, content, encoding);
      
      socket.emit('fs:edit:result', {
        path: filePath,
        editsApplied: editCount,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `EDIT: ${filePath} (${editCount} edits applied)`);
    } catch (error) {
      socket.emit('fs:edit:error', { error: error.message, path: filePath });
      log('error', `EDIT error: ${error.message}`);
    }
  });
  
  // ═══ BATCH - Coklu Dosya Islemi ═══
  socket.on('fs:batch', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:batch:error', { error: 'Not authenticated' });
    }
    
    const { operations } = data;
    const results = [];
    
    try {
      for (const op of operations) {
        try {
          switch (op.type) {
            case 'read': {
              if (!isPathAllowed(op.path)) {
                results.push({ type: 'read', path: op.path, error: 'Path not allowed' });
                continue;
              }
              const content = fs.readFileSync(op.path, op.encoding || 'utf8');
              results.push({ type: 'read', path: op.path, content, success: true });
              break;
            }
            case 'write': {
              if (!isPathAllowed(op.path)) {
                results.push({ type: 'write', path: op.path, error: 'Path not allowed' });
                continue;
              }
              const dir = path.dirname(op.path);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.writeFileSync(op.path, op.content, op.encoding || 'utf8');
              results.push({ type: 'write', path: op.path, success: true });
              break;
            }
            case 'delete': {
              if (!isPathAllowed(op.path)) {
                results.push({ type: 'delete', path: op.path, error: 'Path not allowed' });
                continue;
              }
              if (fs.existsSync(op.path)) {
                const bStats = fs.statSync(op.path);
                if (bStats.isDirectory()) {
                  fs.rmSync(op.path, { recursive: op.recursive || false });
                } else {
                  fs.unlinkSync(op.path);
                }
              }
              results.push({ type: 'delete', path: op.path, success: true });
              break;
            }
            case 'mkdir': {
              if (!isPathAllowed(op.path)) {
                results.push({ type: 'mkdir', path: op.path, error: 'Path not allowed' });
                continue;
              }
              fs.mkdirSync(op.path, { recursive: true });
              results.push({ type: 'mkdir', path: op.path, success: true });
              break;
            }
            case 'copy': {
              if (!isPathAllowed(op.source) || !isPathAllowed(op.destination)) {
                results.push({ type: 'copy', error: 'Path not allowed' });
                continue;
              }
              fs.copyFileSync(op.source, op.destination);
              results.push({ type: 'copy', source: op.source, destination: op.destination, success: true });
              break;
            }
            default:
              results.push({ type: op.type, error: 'Unknown operation type' });
          }
        } catch (opError) {
          results.push({ type: op.type, path: op.path, error: opError.message });
        }
      }
      
      socket.emit('fs:batch:result', {
        results,
        totalOperations: operations.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => r.error).length,
        timestamp: new Date().toISOString()
      });
      
      log('success', `BATCH: ${operations.length} operations (${results.filter(r => r.success).length} ok)`);
    } catch (error) {
      socket.emit('fs:batch:error', { error: error.message });
      log('error', `BATCH error: ${error.message}`);
    }
  });
  
  // ═══ ANALYZE - Proje Analizi ═══
  socket.on('fs:analyze', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:analyze:error', { error: 'Not authenticated' });
    }
    
    const { path: projectPath, depth = 3 } = data;
    
    try {
      if (!isPathAllowed(projectPath)) {
        return socket.emit('fs:analyze:error', { error: 'Path not allowed', path: projectPath });
      }
      
      if (!fs.existsSync(projectPath)) {
        return socket.emit('fs:analyze:error', { error: 'Path does not exist', path: projectPath });
      }
      
      const analysis = {
        path: projectPath,
        projectTypes: detectProjectType(projectPath),
        structure: {},
        files: { total: 0, byExtension: {} },
        directories: { total: 0 },
        largestFiles: [],
        suggestions: [],
        dependencies: {},
        scripts: {}
      };
      
      try {
        const pkgPath = path.join(projectPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          analysis.dependencies = {
            ...pkg.dependencies,
            ...pkg.devDependencies
          };
          analysis.scripts = pkg.scripts || {};
        }
      } catch (e) {}
      
      function analyzeDir(dirPath, currentDepth, structure) {
        if (currentDepth > depth) return;
        
        try {
          const items = fs.readdirSync(dirPath);
          
          for (const item of items) {
            if (item.startsWith('.') || item === 'node_modules' || item === '__pycache__') continue;
            
            const itemPath = path.join(dirPath, item);
            const itemStats = getStats(itemPath);
            
            if (!itemStats) continue;
            
            if (itemStats.isDirectory) {
              analysis.directories.total++;
              structure[item] = { type: 'directory', children: {} };
              analyzeDir(itemPath, currentDepth + 1, structure[item].children);
            } else {
              analysis.files.total++;
              
              const ext = path.extname(item).toLowerCase() || 'no-extension';
              analysis.files.byExtension[ext] = (analysis.files.byExtension[ext] || 0) + 1;
              
              if (analysis.largestFiles.length < 10) {
                analysis.largestFiles.push({ path: itemPath, size: itemStats.size });
                analysis.largestFiles.sort((a, b) => b.size - a.size);
              } else if (itemStats.size > analysis.largestFiles[9].size) {
                analysis.largestFiles.push({ path: itemPath, size: itemStats.size });
                analysis.largestFiles.sort((a, b) => b.size - a.size);
                analysis.largestFiles.pop();
              }
              
              structure[item] = { type: 'file', size: itemStats.size };
            }
          }
        } catch (e) {}
      }
      
      analyzeDir(projectPath, 0, analysis.structure);
      
      if (analysis.projectTypes.includes('Node.js')) {
        if (!analysis.files.byExtension['.md']) {
          analysis.suggestions.push('README.md dosyasi eklemeyi dusunun');
        }
        if (!analysis.files.byExtension['.test.'] && !analysis.files.byExtension['.spec.']) {
          analysis.suggestions.push('Test dosyalari eklemeyi dusunun');
        }
      }
      
      if (Object.keys(analysis.dependencies).length > 20) {
        analysis.suggestions.push('Bagimlilik sayisi yuksek, gereksiz paketleri temizleyin');
      }
      
      socket.emit('fs:analyze:result', {
        ...analysis,
        timestamp: new Date().toISOString()
      });
      
      log('success', `ANALYZE: ${projectPath} (${analysis.files.total} files, ${analysis.directories.total} dirs)`);
    } catch (error) {
      socket.emit('fs:analyze:error', { error: error.message, path: projectPath });
      log('error', `ANALYZE error: ${error.message}`);
    }
  });
  
  // ═══ STREAM READ - Buyuk Dosya Okuma ═══
  socket.on('fs:stream:start', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:stream:error', { error: 'Not authenticated' });
    }
    
    const { path: filePath, chunkSize = 65536 } = data;
    
    try {
      if (!isPathAllowed(filePath)) {
        return socket.emit('fs:stream:error', { error: 'Path not allowed' });
      }
      
      const streamStats = fs.statSync(filePath);
      if (streamStats.isDirectory()) {
        return socket.emit('fs:stream:error', { error: 'Cannot stream a directory' });
      }
      
      const streamId = uuidv4();
      const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });
      let bytesRead = 0;
      
      stream.on('data', (chunk) => {
        bytesRead += chunk.length;
        socket.emit('fs:stream:chunk', {
          streamId,
          chunk: chunk.toString('base64'),
          bytesRead,
          totalSize: streamStats.size,
          progress: (bytesRead / streamStats.size * 100).toFixed(2)
        });
      });
      
      stream.on('end', () => {
        socket.emit('fs:stream:end', { streamId, totalBytes: bytesRead });
        log('info', `STREAM END: ${filePath} (${bytesRead} bytes)`);
      });
      
      stream.on('error', (error) => {
        socket.emit('fs:stream:error', { streamId, error: error.message });
      });
      
      socket.emit('fs:stream:start', {
        streamId,
        path: filePath,
        size: streamStats.size
      });
      
      log('info', `STREAM START: ${filePath}`);
    } catch (error) {
      socket.emit('fs:stream:error', { error: error.message });
    }
  });
  
  // ═══ STREAM CANCEL ═══
  socket.on('fs:stream:cancel', (data) => {
    // Stream iptal - ileride implementasyon eklenebilir
    socket.emit('fs:stream:cancel:result', { success: true });
  });
  
  // ═══ DRIVES - Suruculeri Listele ═══
  socket.on('fs:drives', () => {
    if (!isAuthenticated) {
      return socket.emit('fs:drives:error', { error: 'Not authenticated' });
    }
    
    socket.emit('fs:drives:result', { drives: getDrives() });
  });
  
  // ═══ EXISTS - Dosya/Dizin Varlik Kontrolu ═══
  socket.on('fs:exists', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:exists:error', { error: 'Not authenticated' });
    }
    
    const { path: checkPath } = data;
    
    try {
      const exists = fs.existsSync(checkPath);
      const existsStats = exists ? getStats(checkPath) : null;
      
      socket.emit('fs:exists:result', {
        path: checkPath,
        exists,
        stats: existsStats
      });
    } catch (error) {
      socket.emit('fs:exists:error', { error: error.message });
    }
  });
  
  // ═══ WATCH - Dosya/Dizin Izleme ═══
  socket.on('fs:watch', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:watch:error', { error: 'Not authenticated' });
    }
    
    const { path: watchPath, recursive = true } = data;
    
    try {
      if (!isPathAllowed(watchPath)) {
        return socket.emit('fs:watch:error', { error: 'Path not allowed' });
      }
      
      const watchId = uuidv4();
      
      try {
        const watcher = fs.watch(watchPath, { recursive }, (eventType, filename) => {
          socket.emit('fs:watch:event', {
            watchId,
            path: watchPath,
            eventType,
            filename,
            timestamp: new Date().toISOString()
          });
        });
        
        // Socket baglantisi kesildiginde watcher'i kapat
        socket.on('disconnect', () => {
          watcher.close();
        });
        
        socket.emit('fs:watch:start', {
          watchId,
          path: watchPath,
          recursive,
          success: true
        });
        
        log('info', `WATCH started: ${watchPath} (id: ${watchId})`);
      } catch (watchError) {
        socket.emit('fs:watch:error', { error: watchError.message });
      }
    } catch (error) {
      socket.emit('fs:watch:error', { error: error.message });
    }
  });
  
  // ═══ TERMINAL EXECUTE - Uzak Komut Calistirma ═══
  socket.on('terminal:execute', (data) => {
    if (!isAuthenticated) {
      return socket.emit('terminal:execute:error', { error: 'Not authenticated' });
    }
    
    const { command, cwd, timeout = 30000 } = data;
    
    try {
      const shellInfo = resolveShell();
      
      let spawnCmd, spawnArgs;
      
      if (shellInfo.type === 'powershell') {
        spawnCmd = shellInfo.shell;
        spawnArgs = ['-NoProfile', '-NonInteractive', '-Command', command];
      } else if (shellInfo.type === 'cmd') {
        spawnCmd = shellInfo.shell;
        spawnArgs = ['/c', command];
      } else {
        spawnCmd = shellInfo.shell;
        spawnArgs = ['-c', command];
      }
      
      log('info', `TERMINAL: ${command} (shell: ${shellInfo.type})`);
      
      const proc = spawn(spawnCmd, spawnArgs, {
        cwd: cwd || process.cwd(),
        env: { ...process.env },
        shell: false,
        windowsHide: true
      });
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Timeout yonetimi
      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        socket.emit('terminal:execute:result', {
          command,
          stdout,
          stderr: stderr + '\n[TIMEOUT] Komut zaman asimina ugradi',
          exitCode: -1,
          timedOut: true,
          timestamp: new Date().toISOString()
        });
      }, timeout);
      
      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        socket.emit('terminal:execute:result', {
          command,
          stdout,
          stderr,
          exitCode: code,
          timedOut: false,
          timestamp: new Date().toISOString()
        });
        log('info', `TERMINAL DONE: ${command} (code: ${code})`);
      });
      
      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        socket.emit('terminal:execute:error', {
          command,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        log('error', `TERMINAL error: ${error.message}`);
      });
      
    } catch (error) {
      socket.emit('terminal:execute:error', {
        command,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      log('error', `TERMINAL error: ${error.message}`);
    }
  });
  
  // ═══ Baglanti Kesilmesi ═══
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    log('disconnect', `Baglanti kesildi: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUNUCUYU BASLAT
// ═══════════════════════════════════════════════════════════════════════════

server.listen(CONFIG.PORT, () => {
  console.log('\n');
  console.log('================================================================');
  console.log('               DOSYATRANS v3.0 - AI File Bridge');
  console.log('================================================================');
  console.log(`  Port:       ${CONFIG.PORT}`);
  console.log(`  Platform:   ${CONFIG.PLATFORM}`);
  console.log(`  Root Path:  ${CONFIG.ROOT_PATH}`);
  console.log(`  Auth Token: ${CONFIG.AUTH_TOKEN}`);
  console.log('================================================================');
  console.log(`  Web UI:     http://localhost:${CONFIG.PORT}`);
  console.log(`  WebSocket:  ws://localhost:${CONFIG.PORT}`);
  console.log(`  Health:     http://localhost:${CONFIG.PORT}/health`);
  console.log('================================================================');
  console.log('  Cloudflared otomatik baslatilacak...');
  console.log('  Tunnel URL algilandiginda arayuze otomatik gonderilecek.');
  console.log('================================================================\n');
  
  // Cloudflared'i otomatik baslat
  startCloudflared();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nSunucu kapatiliyor...');
  server.close(() => {
    console.log('Sunucu kapatildi.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nSunucu kapatiliyor (SIGTERM)...');
  server.close(() => {
    console.log('Sunucu kapatildi.');
    process.exit(0);
  });
});

// Hata yonetimi
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
