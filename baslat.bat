@echo off
title DOSYATRANS v3.0 - AI Baglanti Merkezi
cls

echo.
echo  ================================================================
echo         DOSYATRANS v3.0 - AI File Bridge
echo  ================================================================
echo.

:: Proje dizinine gec
cd /d "%~dp0"

:: Node.js kontrol
echo [1/4] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [HATA] Node.js yuklu degil!
    echo  Lutfen once kur.bat calistirin.
    echo.
    pause
    exit /b 1
)
echo  [OK] Node.js yuklu

:: Bagimlilik kontrol
echo.
echo [2/4] Bagimliliklar kontrol ediliyor...
if not exist "node_modules" (
    echo  npm install calistiriliyor...
    call npm install
    if %errorlevel% neq 0 (
        echo  [HATA] npm install basarisiz!
        pause
        exit /b 1
    )
)
echo  [OK] Bagimliliklar hazir

:: Sunucuyu baslat
echo.
echo [3/4] Sunucu baslatiliyor...
echo  Arayuz icin: http://localhost:3001
echo.

start "" "http://localhost:3001"
start /b "" node server.js

:: Bekle - sunucunun baslamasi icin
timeout /t 4 /nobreak >nul

:: Cloudflared kontrol
echo [4/4] Cloudflare Tunnel kontrol ediliyor...
if exist "cloudflared.exe" (
    echo  [OK] cloudflared.exe bulundu
    echo  Tunnel baslatiliyor...
    echo.
    echo  ================================================================
    echo  TUNNEL URL'INIZ ARAYUZDE OTOMATIK GORUNECEKTIR
    echo  http://localhost:3001 adresinden kopyalayabilirsiniz
    echo  ================================================================
    echo.
    cloudflared.exe tunnel --url http://localhost:3001
) else (
    echo  [UYARI] cloudflared.exe bulunamadi!
    echo  Tunnel olmadan sadece lokal erisim var.
    echo  Cloudflared kurmak icin kur.bat calistirin.
    echo.
    echo  Veya manuel olarak:
    echo  cloudflared tunnel --url http://localhost:3001
    echo.
    echo  Sunucu calisiyor: http://localhost:3001
    echo.
    pause
    :: Sunucu calismaya devam etsin
    :loop
    timeout /t 60 /nobreak >nul
    goto loop
)
