/**
 * DOSYATRANS v3.0 - Ornek Kullanim
 *
 * Bu dosya, baglan.js ile baglanti kurduktan sonra nasil calisilacagini
 * gosterir. Her adimi sirayla dene.
 */

// NOT: baglan.js zaten calisiyor ve 's' degiskeni socket baglantisini tutuyor.
// Asagidaki komutlari baglanti kurulduktan sonra calistir.

// ============================================
// ADIM 1: Proje dosyalarini listele
// ============================================
s.emit("fs:list", {path: "C:\\kodlar\\dosyatrans-main"});

// Sonucu dinle:
s.on("fs:list:result", (data) => {
  console.log("Dizin:", data.path);
  data.items.forEach(i => console.log(i.isDirectory ? "[DIR]" : "[FILE]", i.name));
});
s.on("fs:list:error", (err) => console.error("Hata:", err));


// ============================================
// ADIM 2: server.js dosyasini oku
// ============================================
s.emit("fs:read", {path: "C:\\kodlar\\dosyatrans-main\\server.js"});

// Sonucu dinle:
s.on("fs:read:result", (data) => {
  console.log("Dosya:", data.path);
  console.log("Boyut:", data.size, "byte");
  console.log("Satir sayisi:", data.lines);
  console.log("Icerik (ilk 50 satir):", data.content.split("\n").slice(0, 50).join("\n"));
});
s.on("fs:read:error", (err) => console.error("Hata:", err));


// ============================================
// ADIM 3: Satir bazli okuma
// ============================================
s.emit("fs:read", {path: "C:\\kodlar\\dosyatrans-main\\server.js", startLine: 1, endLine: 30});


// ============================================
// ADIM 4: Test dosyasi yaz
// ============================================
s.emit("fs:write", {
  path: "C:\\kodlar\\dosyatrans-main\\ai-test.txt",
  content: "DOSYATRANS v3.0 AI Test Dosyasi\nTest zamani: " + new Date().toISOString()
});

// Sonucu dinle:
s.on("fs:write:result", (data) => {
  console.log("Yazma sonucu:", data.success, "Boyut:", data.size);
});


// ============================================
// ADIM 5: Dosya duzenle (find & replace)
// ============================================
s.emit("fs:edit", {
  path: "C:\\kodlar\\dosyatrans-main\\ai-test.txt",
  edits: [{oldText: "AI Test", newText: "AI Test BASARILI"}]
});

// Sonucu dinle:
s.on("fs:edit:result", (data) => {
  console.log("Duzenleme sonucu:", data.success, "Degisiklik:", data.editsApplied);
});


// ============================================
// ADIM 6: Arama
// ============================================
s.emit("fs:search", {
  path: "C:\\kodlar\\dosyatrans-main",
  pattern: "socket",
  fileType: ".js"
});


// ============================================
// ADIM 7: Terminal komutu calistir
// ============================================
s.emit("terminal:execute", {
  command: "node --version",
  cwd: "C:\\kodlar\\dosyatrans-main"
});

// Sonucu dinle:
s.on("terminal:execute:result", (data) => {
  console.log("Komut:", data.command);
  console.log("Cikti:", data.stdout);
  console.log("Cikis kodu:", data.exitCode);
});


// ============================================
// ADIM 8: Proje analizi
// ============================================
s.emit("fs:analyze", {path: "C:\\kodlar\\dosyatrans-main"});

// Sonucu dinle:
s.on("fs:analyze:result", (data) => {
  console.log("Proje tipleri:", data.projectTypes);
  console.log("Toplam dosya:", data.files.total);
  console.log("Dosya turleri:", data.files.byType);
});


// ============================================
// ADIM 9: Temizlik (test dosyasini sil)
// ============================================
s.emit("fs:delete", {path: "C:\\kodlar\\dosyatrans-main\\ai-test.txt"});
