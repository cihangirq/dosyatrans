@echo off
title DOSYATRANS v3.0 - Yeniden Baslat
cls

echo.
echo  ================================================================
echo       DOSYATRANS v3.0 - Yeniden Baslatiliyor
echo  ================================================================
echo.

:: Proje dizinine gec
cd /d "%~dp0"

:: Eski Node.js sureclerini sonlandir
echo [1/3] Eski surecler sonlandiriliyor...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Sunucuyu baslat
echo [2/3] Sunucu baslatiliyor...
start "" "http://localhost:3001"
start /b "" node server.js

:: Bekle
timeout /t 3 /nobreak >nul

:: Tunnel baslat
echo [3/3] Tunnel baslatiliyor...
if exist "cloudflared.exe" (
    cloudflared.exe tunnel --url http://localhost:3001
) else (
    echo  [UYARI] cloudflared.exe bulunamadi!
    echo  Sadece lokal erisim: http://localhost:3001
    pause
)
