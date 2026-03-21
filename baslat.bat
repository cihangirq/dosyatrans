@echo off
title DOSYATRANS - AI Baglanti Merkezi
cls

echo.
echo  ================================================
echo         DOSYATRANS - AI File Bridge
echo  ================================================
echo.

:: Sunucu baslat
echo [1/3] Sunucu baslatiliyor...
start /b "" node server.js

:: Bekle
timeout /t 3 /nobreak >nul

:: Arayuzu ac
echo [2/3] Arayuz aciliyor...
start "" "arayuz.html"

:: Tunnel baslat
echo [3/3] Tunnel baslatiliyor...
echo.
echo  ================================================
echo  ASAGIDAKI URL'I KOPYALAYIN:
echo  ================================================
echo.

cloudflared.exe tunnel --url http://localhost:3001
