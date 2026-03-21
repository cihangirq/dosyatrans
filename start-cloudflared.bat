@echo off
chcp 65001 >nul
title DOSYATRANS - Cloudflare Tunnel

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                   DOSYATRANS                                  ║
echo ║              Cloudflare Tunnel Baslatma                      ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

if not exist "cloudflared.exe" (
    echo [HATA] cloudflared.exe bulunamadi!
    echo.
    echo Oncelikle install-cloudflared.bat dosyasini calistirin.
    echo.
    pause
    exit /b 1
)

echo [BILGI] Tunnel baslatiliyor...
echo.
echo ═══════════════════════════════════════════════════════════════
echo  ONEMLI: Asagidaki URL'yi AI asistaniniza verin
echo ═══════════════════════════════════════════════════════════════
echo.

cloudflared.exe tunnel --url http://localhost:3001

pause
