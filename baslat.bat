@echo off
title DOSYATRANS - AI Baglanti Merkezi
cls

echo.
echo  ================================================
echo         DOSYATRANS - AI File Bridge
echo  ================================================
echo.
echo  [1/3] Sunucu baslatiliyor...
start /b "" node server.js

echo  [2/3] Tunnel olusturuluyor...
timeout /t 2 /nobreak >nul

:: Tunnel baslat
cloudflared.exe tunnel --url http://localhost:3001

