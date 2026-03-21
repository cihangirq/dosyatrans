#!/bin/bash

# DOSYATRANS - AI File Bridge Server
# Başlatma scripti

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                   DOSYATRANS                                  ║"
echo "║               AI File Bridge Server                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Node.js kontrol et
if ! command -v node &> /dev/null; then
    echo "[HATA] Node.js yüklü değil!"
    echo "Lütfen https://nodejs.org/ adresinden Node.js'i yükleyin."
    exit 1
fi

# node_modules kontrol et
if [ ! -d "node_modules" ]; then
    echo "[BILGI] Bağımlılıklar yükleniyor..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[HATA] Bağımlılıklar yüklenemedi!"
        exit 1
    fi
    echo ""
fi

# Sunucuyu başlat
echo "[BILGI] Sunucu başlatılıyor..."
echo ""
node server.js
