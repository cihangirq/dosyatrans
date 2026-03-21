@echo off
chcp 65001 >nul
title DOSYATRANS - AI File Bridge Server

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                   DOSYATRANS                                  ║
echo ║               AI File Bridge Server                           ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: Node.js kontrol et
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Node.js yüklü değil!
    echo Lütfen https://nodejs.org/ adresinden Node.js'i yükleyin.
    pause
    exit /b 1
)

:: node_modules kontrol et
if not exist "node_modules" (
    echo [BILGI] Bağımlılıklar yükleniyor...
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] Bağımlılıklar yüklenemedi!
        pause
        exit /b 1
    )
    echo.
)

:: Sunucuyu başlat
echo [BILGI] Sunucu başlatılıyor...
echo.
node server.js

pause
