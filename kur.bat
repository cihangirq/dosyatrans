@echo off
title DOSYATRANS - Yeni Bilgisayar Kurulumu
cls

echo.
echo  ================================================================
echo            DOSYATRANS - Yeni Bilgisayar Kurulumu
echo  ================================================================
echo.

:: Node.js kontrol et
echo [1/5] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [UYARI] Node.js yuklu degil!
    echo.
    echo  Node.js indiriliyor...
    echo  Lutfen bekleyin...
    echo.

    :: Node.js indir ve yukle
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'nodejs.msi'"

    if exist nodejs.msi (
        echo  Node.js yukleniyor...
        start /wait msiexec /i nodejs.msi /quiet /norestart
        del nodejs.msi
        echo  [TAMAM] Node.js yuklendi!
        echo.
        echo  NOT: Terminali kapatip tekrar acin, sonra tekrar kur.bat calistirin.
        pause
        exit /b 0
    ) else (
        echo  [HATA] Node.js indirilemedi!
        echo  Manuel olarak indirin: https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    echo  [OK] Node.js yuklu
)

:: Projeyi indir
echo.
echo [2/5] DOSYATRANS indiriliyor...
if not exist "dosyatrans" (
    git clone https://github.com/cihangirq/dosyatrans.git
    if %errorlevel% neq 0 (
        echo  [HATA] Git ile indirme basarisiz!
        echo  ZIP olarak indiriliyor...
        powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cihangirq/dosyatrans/archive/refs/heads/main.zip' -OutFile 'dosyatrans.zip'"
        powershell -Command "Expand-Archive -Path 'dosyatrans.zip' -DestinationPath '.' -Force"
        ren dosyatrans-main dosyatrans
    )
) else (
    echo  [OK] Klasor zaten mevcut
)

cd dosyatrans

:: Bagimliliklari yukle
echo.
echo [3/5] Bagimliliklar yukleniyor...
if not exist "node_modules" (
    npm install
    if %errorlevel% neq 0 (
        echo  [HATA] npm install basarisiz!
        pause
        exit /b 1
    )
) else (
    echo  [OK] node_modules mevcut
)

:: Cloudflared kontrol et
echo.
echo [4/5] Cloudflared kontrol ediliyor...
if not exist "cloudflared.exe" (
    echo  Cloudflared indiriliyor...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    if %errorlevel% neq 0 (
        echo  [HATA] Cloudflared indirilemedi!
        pause
        exit /b 1
    )
) else (
    echo  [OK] cloudflared.exe mevcut
)

:: Tamamlandi
echo.
echo [5/5] Kurulum tamamlandi!
echo.
echo  ================================================================
echo                    KURULUM BASARILI!
echo  ================================================================
echo.
echo  SIMDI NE YAPMALISINIZ?
echo.
echo  1. Bu klasore gidin: dosyatrans
echo  2. baslat.bat dosyasini cift tiklayin
echo  3. Acilan arayuzden bilgileri kopyalayin
echo  4. AI sohbetine yapistirin
echo.
echo  ================================================================
echo.

pause
