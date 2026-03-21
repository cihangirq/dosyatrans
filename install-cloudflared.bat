@echo off
chcp 65001 >nul
title Cloudflare Tunnel Kurulumu

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║           CLOUDFLARE TUNNEL KURULUM ARACI                     ║
echo ║                   DOSYATRANS için                             ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

:: cloudflared.exe kontrol et
if exist "cloudflared.exe" (
    echo [BILGI] cloudflared.exe zaten mevcut.
    goto :start_tunnel
)

:: İndir
echo [1/2] Cloudflared indiriliyor...
echo.

powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'}"

if %errorlevel% neq 0 (
    echo.
    echo [HATA] İndirme başarısız oldu!
    echo Manuel olarak indirin: https://github.com/cloudflare/cloudflared/releases
    pause
    exit /b 1
)

echo.
echo [BASARILI] cloudflared.exe indirildi!
echo.

:start_tunnel
echo [2/2] Tunnel başlatılıyor...
echo.
echo ═══════════════════════════════════════════════════════════════
echo  ONEMLI: Asagidaki URL'yi kopyalayin ve AI asistaniniza verin
echo ═══════════════════════════════════════════════════════════════
echo.

cloudflared.exe tunnel --url http://localhost:3001

pause
