/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                           DOSYATRANS                                       ║
 * ║                     AI File Bridge Server                                  ║
 * ║                                                                           ║
 * ║  Bu sunucu bilgisayarınızdaki dosyalara uzaktan erişim sağlar.            ║
 * ║  AI asistanınızın dosya okuma, yazma, analiz işlemlerini                  ║
 * ║  gerçekleştirmesine olanak tanır.                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * KULLANIM:
 *   npm install    - Bağımlılıkları yükle
 *   npm start      - Sunucuyu başlat
 * 
 * TUNNEL OLUŞTURMA:
 *   ngrok http 3001
 *   veya
 *   cloudflared tunnel --url http://localhost:3001
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

// ═══════════════════════════════════════════════════════════════════════════
// KONFİGÜRASYON
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Sunucu portu
  PORT: process.env.PORT || 3001,
  
  // Güvenlik token'ı - BURAYI DEĞİŞTİRİN!
  AUTH_TOKEN: process.env.AUTH_TOKEN || 'dosyatrans-secure-token-2024',
  
  // Platform algılama
  PLATFORM: process.platform,
  ROOT_PATH: process.platform === 'win32' 
    ? process.cwd().split(path.sep)[0] + path.sep 
    : '/',
  
  // İzin verilen yollar (boş = tüm yollar erişilebilir)
  ALLOWED_PATHS: process.env.ALLOWED_PATHS 
    ? process.env.ALLOWED_PATHS.split(';') 
    : [],
  
  // Engellenecek yollar
  BLOCKED_PATHS: process.env.BLOCKED_PATHS 
    ? process.env.BLOCKED_PATHS.split(';') 
    : [],
  
  // Maksimum dosya okuma boyutu (bytes)
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
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
  maxHttpBufferSize: 50e6 // 50MB
});

// Bağlı istemciler
const connectedClients = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Token doğrulama
 */
function validateToken(token) {
  return token === CONFIG.AUTH_TOKEN;
}

/**
 * Yol güvenlik kontrolü
 */
function isPathAllowed(targetPath) {
  try {
    const resolved = path.resolve(targetPath);
    
    // Engellenen yolları kontrol et
    for (const blocked of CONFIG.BLOCKED_PATHS) {
      if (resolved.toLowerCase().startsWith(blocked.toLowerCase())) {
        return false;
      }
    }
    
    // İzin verilen yollar boşsa, tüm yollar erişilebilir
    if (CONFIG.ALLOWED_PATHS.length === 0) return true;
    
    // İzin verilen yolları kontrol et
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
 * Sürücüleri listele
 */
function getDrives() {
  if (CONFIG.PLATFORM === 'win32') {
    const drives = [];
    for (let letter = 65; letter <= 90; letter++) {
      const drive = String.fromCharCode(letter) + ':\\';
      try {
        fs.accessSync(drive, fs.constants.R_OK);
        drives.push({ name: drive, path: drive });
      } catch (e) {
        // Sürücü yok veya erişilemez
      }
    }
    return drives;
  } else {
    // Linux/macOS için
    return [{ name: 'Root', path: '/' }];
  }
}

/**
 * Proje türünü algıla
 */
function detectProjectType(dirPath) {
  const indicators = {
    'Next.js': ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    'React': ['package.json'],
    'Vue.js': ['vue.config.js', 'vite.config.js'],
    'Angular': ['angular.json'],
    'Node.js': ['package.json'],
    'Python': ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
    'Java/Maven': ['pom.xml'],
    'Java/Gradle': ['build.gradle', 'build.gradle.kts'],
    'C#/.NET': ['.csproj', '.sln'],
    'Go': ['go.mod'],
    'Rust': ['Cargo.toml'],
    'PHP/Laravel': ['composer.json', 'artisan'],
    'Ruby/Rails': ['Gemfile', 'config/application.rb'],
    'Django': ['manage.py', 'settings.py'],
  };
  
  try {
    const files = fs.readdirSync(dirPath);
    const projectTypes = [];
    
    // Next.js kontrolü
    if (files.some(f => f.startsWith('next.config'))) {
      projectTypes.push('Next.js');
    }
    
    // package.json varsa detaylı kontrol
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
    
    // Diğer kontroller
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
 * Log yazdır
 */
function log(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': '📋',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️',
    'connect': '🔗',
    'disconnect': '🔌'
  }[type] || '📝';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
  if (details) {
    console.log('   Details:', typeof details === 'object' ? JSON.stringify(details, null, 2) : details);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Ana sayfa - Durum bilgisi
app.get('/', (req, res) => {
  res.json({
    name: 'DOSYATRANS - AI File Bridge Server',
    version: '1.0.0',
    status: 'running',
    platform: CONFIG.PLATFORM,
    port: CONFIG.PORT,
    connectedClients: connectedClients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    documentation: 'https://github.com/yourusername/dosyatrans'
  });
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Sürücüleri listele (HTTP)
app.get('/drives', (req, res) => {
  res.json({ drives: getDrives() });
});

// Token doğrulama (HTTP)
app.post('/auth', (req, res) => {
  const { token } = req.body;
  if (validateToken(token)) {
    res.json({ 
      success: true, 
      platform: CONFIG.PLATFORM,
      rootPath: CONFIG.ROOT_PATH,
      drives: getDrives()
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  log('connect', `Yeni bağlantı: ${socket.id}`);
  let isAuthenticated = false;
  let clientInfo = {};
  
  // ═══ AUTH - Kimlik Doğrulama ═══
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
        serverVersion: '1.0.0',
        socketId: socket.id
      });
      
      log('success', `Kimlik doğrulandı: ${socket.id}`);
    } else {
      socket.emit('auth:failed', { error: 'Invalid token' });
      socket.disconnect();
      log('error', `Kimlik doğrulama başarısız: ${socket.id}`);
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
          const stats = getStats(itemPath);
          if (stats) {
            fileList.push(stats);
          }
        } catch (e) {
          // Erişim hatası - yoksay
        }
      }
      
      // Dizinler önce, sonra dosyalar (alfabetik)
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
      
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        return socket.emit('fs:read:error', { error: 'Cannot read a directory', path: filePath });
      }
      
      // Dosya boyutu kontrolü
      if (stats.size > CONFIG.MAX_FILE_SIZE) {
        return socket.emit('fs:read:error', { 
          error: `File too large. Max size: ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
          path: filePath,
          size: stats.size
        });
      }
      
      // Satır bazlı okuma
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
          size: stats.size,
          encoding
        });
      } else {
        const content = fs.readFileSync(filePath, encoding);
        
        socket.emit('fs:read:result', {
          path: filePath,
          content,
          size: stats.size,
          encoding,
          mimeType: mime.lookup(filePath) || 'application/octet-stream'
        });
      }
      
      log('info', `READ: ${filePath} (${stats.size} bytes)`);
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
      
      // Dizin yoksa oluştur
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (mode === 'append') {
        fs.appendFileSync(filePath, content, encoding);
      } else {
        fs.writeFileSync(filePath, content, encoding);
      }
      
      const stats = fs.statSync(filePath);
      
      socket.emit('fs:write:result', {
        path: filePath,
        size: stats.size,
        mode,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `WRITE: ${filePath} (${stats.size} bytes, mode: ${mode})`);
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
      
      const stats = fs.statSync(targetPath);
      
      if (stats.isDirectory()) {
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
        wasDirectory: stats.isDirectory(),
        success: true,
        timestamp: new Date().toISOString()
      });
      
      log('success', `DELETE: ${targetPath}`);
    } catch (error) {
      socket.emit('fs:delete:error', { error: error.message, path: targetPath });
      log('error', `DELETE error: ${error.message}`);
    }
  });
  
  // ═══ MKDIR - Dizin Oluşturma ═══
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
            
            // Gizli dosyaları atla
            if (!includeHidden && item.startsWith('.')) continue;
            
            // node_modules gibi klasörleri atla
            if (item === 'node_modules' || item === '__pycache__' || item === '.git') continue;
            
            const itemPath = path.join(dirPath, item);
            const stats = getStats(itemPath);
            
            if (!stats) continue;
            
            // İsim eşleşmesi
            const nameMatch = pattern ? 
              item.toLowerCase().includes(pattern.toLowerCase()) : true;
            
            // Dosya türü eşleşmesi
            const typeMatch = fileType ? 
              item.toLowerCase().endsWith(fileType.toLowerCase()) : true;
            
            if (nameMatch && typeMatch) {
              results.push(stats);
              searchCount++;
            }
            
            // Alt dizinleri tara
            if (stats.isDirectory && depth < maxDepth) {
              searchDir(itemPath, depth + 1);
            }
          }
        } catch (e) {
          // Erişim hatası - yoksay
        }
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
      
      // package.json oku
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
            // Gizli dosyaları ve klasörleri atla
            if (item.startsWith('.') || item === 'node_modules' || item === '__pycache__') {
              continue;
            }
            
            const itemPath = path.join(dirPath, item);
            const stats = getStats(itemPath);
            
            if (!stats) continue;
            
            if (stats.isDirectory) {
              analysis.directories.total++;
              structure[item] = { type: 'directory', children: {} };
              analyzeDir(itemPath, currentDepth + 1, structure[item].children);
            } else {
              analysis.files.total++;
              
              // Uzantıya göre sınıflandır
              const ext = path.extname(item).toLowerCase() || 'no-extension';
              analysis.files.byExtension[ext] = (analysis.files.byExtension[ext] || 0) + 1;
              
              // En büyük dosyaları takip et
              if (analysis.largestFiles.length < 10) {
                analysis.largestFiles.push({ path: itemPath, size: stats.size });
                analysis.largestFiles.sort((a, b) => b.size - a.size);
              } else if (stats.size > analysis.largestFiles[9].size) {
                analysis.largestFiles.push({ path: itemPath, size: stats.size });
                analysis.largestFiles.sort((a, b) => b.size - a.size);
                analysis.largestFiles.pop();
              }
              
              structure[item] = { type: 'file', size: stats.size };
            }
          }
        } catch (e) {
          // Erişim hatası
        }
      }
      
      analyzeDir(projectPath, 0, analysis.structure);
      
      // Öneriler
      if (analysis.projectTypes.includes('Node.js')) {
        if (!analysis.files.byExtension['.md']) {
          analysis.suggestions.push('README.md dosyası eklemeyi düşünün');
        }
        if (!analysis.files.byExtension['.test.'] && !analysis.files.byExtension['.spec.']) {
          analysis.suggestions.push('Test dosyaları eklemeyi düşünün');
        }
      }
      
      if (Object.keys(analysis.dependencies).length > 20) {
        analysis.suggestions.push('Bağımlılık sayısı yüksek, gereksiz paketleri temizleyin');
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
      
      // Hedef dizin oluştur
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
      
      log('success', `COPY: ${source} → ${destination}`);
    } catch (error) {
      socket.emit('fs:copy:error', { error: error.message });
      log('error', `COPY error: ${error.message}`);
    }
  });
  
  // ═══ MOVE - Dosya Taşıma ═══
  socket.on('fs:move', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:move:error', { error: 'Not authenticated' });
    }
    
    const { source, destination } = data;
    
    try {
      if (!isPathAllowed(source) || !isPathAllowed(destination)) {
        return socket.emit('fs:move:error', { error: 'Path not allowed' });
      }
      
      // Hedef dizin oluştur
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
      
      log('success', `MOVE: ${source} → ${destination}`);
    } catch (error) {
      socket.emit('fs:move:error', { error: error.message });
      log('error', `MOVE error: ${error.message}`);
    }
  });
  
  // ═══ RENAME - Dosya Yeniden Adlandırma ═══
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
      
      log('success', `RENAME: ${oldPath} → ${newPath}`);
    } catch (error) {
      socket.emit('fs:rename:error', { error: error.message });
      log('error', `RENAME error: ${error.message}`);
    }
  });
  
  // ═══ EXISTS - Dosya/Dizin Varlık Kontrolü ═══
  socket.on('fs:exists', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:exists:error', { error: 'Not authenticated' });
    }
    
    const { path: checkPath } = data;
    
    try {
      const exists = fs.existsSync(checkPath);
      const stats = exists ? getStats(checkPath) : null;
      
      socket.emit('fs:exists:result', {
        path: checkPath,
        exists,
        stats
      });
    } catch (error) {
      socket.emit('fs:exists:error', { error: error.message });
    }
  });
  
  // ═══ STAT - Dosya Detayları ═══
  socket.on('fs:stat', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:stat:error', { error: 'Not authenticated' });
    }
    
    const { path: targetPath } = data;
    
    try {
      if (!isPathAllowed(targetPath)) {
        return socket.emit('fs:stat:error', { error: 'Path not allowed' });
      }
      
      const stats = getStats(targetPath);
      
      if (!stats) {
        return socket.emit('fs:stat:error', { error: 'Path not found' });
      }
      
      socket.emit('fs:stat:result', stats);
    } catch (error) {
      socket.emit('fs:stat:error', { error: error.message });
    }
  });
  
  // ═══ DRIVES - Sürücüleri Listele ═══
  socket.on('fs:drives', () => {
    if (!isAuthenticated) {
      return socket.emit('fs:drives:error', { error: 'Not authenticated' });
    }
    
    socket.emit('fs:drives:result', { drives: getDrives() });
  });
  
  // ═══ STREAM READ - Büyük Dosya Okuma ═══
  socket.on('fs:stream:start', (data) => {
    if (!isAuthenticated) {
      return socket.emit('fs:stream:error', { error: 'Not authenticated' });
    }
    
    const { path: filePath, chunkSize = 65536 } = data;
    
    try {
      if (!isPathAllowed(filePath)) {
        return socket.emit('fs:stream:error', { error: 'Path not allowed' });
      }
      
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
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
          totalSize: stats.size,
          progress: (bytesRead / stats.size * 100).toFixed(2)
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
        size: stats.size
      });
      
      log('info', `STREAM START: ${filePath}`);
    } catch (error) {
      socket.emit('fs:stream:error', { error: error.message });
    }
  });
  
  // ═══ Bağlantı Kesilmesi ═══
  socket.on('disconnect', () => {
    connectedClients.delete(socket.id);
    log('disconnect', `Bağlantı kesildi: ${socket.id}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUNUCUYU BAŞLAT
// ═══════════════════════════════════════════════════════════════════════════

server.listen(CONFIG.PORT, () => {
  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         🚀 DOSYATRANS                                      ║');
  console.log('║                      AI File Bridge Server                                 ║');
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log(`║  Port: ${CONFIG.PORT.toString().padEnd(67)}║`);
  console.log(`║  Platform: ${CONFIG.PLATFORM.padEnd(64)}║`);
  console.log(`║  Root Path: ${CONFIG.ROOT_PATH.padEnd(63)}║`);
  console.log(`║  Auth Token: ${CONFIG.AUTH_TOKEN.padEnd(62)}║`);
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  🔗 WebSocket: ws://localhost:' + CONFIG.PORT);
  console.log('║  🌐 HTTP: http://localhost:' + CONFIG.PORT);
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  📌 Tunnel için ngrok veya cloudflare tunnel kullanın:                     ║');
  console.log('║     ngrok http ' + CONFIG.PORT);
  console.log('║     cloudflared tunnel --url http://localhost:' + CONFIG.PORT);
  console.log('╠═══════════════════════════════════════════════════════════════════════════╣');
  console.log('║  📖 Dokümantasyon: https://github.com/yourusername/dosyatrans              ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  console.log('\n⏳ AI bağlantısı için hazır...\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Sunucu kapatılıyor...');
  server.close(() => {
    console.log('✅ Sunucu kapatıldı.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Sunucu kapatılıyor (SIGTERM)...');
  server.close(() => {
    console.log('✅ Sunucu kapatıldı.');
    process.exit(0);
  });
});

// Hata yönetimi
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});
