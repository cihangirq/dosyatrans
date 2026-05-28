@echo off
title DOSYATRANS v3.0 - Yeni Bilgisayar Kurulumu
cls

echo.
echo  ================================================================
echo       DOSYATRANS v3.0 - Yeni Bilgisayar Kurulumu
echo  ================================================================
echo.
echo  Bu script sunlari otomatik kurar:
echo   - Node.js (JavaScript calistirma ortami)
echo   - Cloudflared (Cloudflare Tunnel)
echo   - Proje bagimliliklari (npm packages)
echo.

:: ──────────────────────────────────────────────────────────────
:: YONETICI HAKLARI KONTROLU
:: ──────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [UYARI] Yonetici haklari ile calismak onerilir.
    echo  Bazı islemler basarisiz olabilir.
    echo.
    echo  Yonetici olarak calistirmak icin:
    echo  - kur.bat uzerine sag tiklayin
    echo  - "Yonetici olarak calistir" secin
    echo.
    pause
)

:: Proje dizinine gec
cd /d "%~dp0"

:: ──────────────────────────────────────────────────────────────
:: 1. NODE.JS KURULUMU
:: ──────────────────────────────────────────────────────────────
echo [1/5] Node.js kontrol ediliyor...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [UYARI] Node.js yuklu degil!
    echo.
    echo  Node.js kuruluyor...
    echo  Lutfen bekleyin, bu biraz zaman alabilir...
    echo.

    :: Yontem 1: winget ile kur (Windows 10+)
    winget --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo  winget ile Node.js LTS kuruluyor...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        
        if %errorlevel% equ 0 (
            echo  [TAMAM] Node.js winget ile kuruldu!
        ) else (
            echo  [UYARI] winget kurulumu basarisiz, alternatif yontem deneniyor...
            goto :install_node_manual
        )
    ) else (
        :install_node_manual
        echo  Node.js MSI indiriliyor...
        powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\nodejs.msi'"
        
        if exist "%TEMP%\nodejs.msi" (
            echo  Node.js yukleniyor...
            msiexec /i "%TEMP%\nodejs.msi" /quiet /norestart
            del "%TEMP%\nodejs.msi"
            echo  [TAMAM] Node.js yuklendi!
        ) else (
            echo  [HATA] Node.js indirilemedi!
            echo  Manuel olarak indirin: https://nodejs.org/
            echo  LTS surumunu indirin ve kurun.
            echo  Ardindan bu scripti tekrar calistirin.
            pause
            exit /b 1
        )
    )
    
    :: PATH'i guncelle (mevcut terminal icin)
    echo  PATH guncelleniyor...
    set "PATH=%PATH%;C:\Program Files\nodejs"
    
    :: Node.js'in calistigini dogrula
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  [ONEMLI] Node.js kuruldu ama PATH guncellenmedi.
        echo  Terminali kapatip tekrar acin, sonra tekrar kur.bat calistirin.
        echo.
        pause
        exit /b 0
    )
) else (
    echo  [OK] Node.js zaten yuklu
)

:: ──────────────────────────────────────────────────────────────
:: 2. GIT KONTROLU
:: ──────────────────────────────────────────────────────────────
echo.
echo [2/5] Git kontrol ediliyor...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Git yuklu degil, kuruluyor...
    winget --version >nul 2>&1
    if %errorlevel% equ 0 (
        winget install Git.Git --accept-package-agreements --accept-source-agreements
    ) else (
        echo  [UYARI] Git kurulamadi. Manuel kurabilirsiniz: https://git-scm.com/
    )
) else (
    echo  [OK] Git yuklu
)

:: ──────────────────────────────────────────────────────────────
:: 3. PROJE DOSYALARI
:: ──────────────────────────────────────────────────────────────
echo.
echo [3/5] Proje dosyalari kontrol ediliyor...
if not exist "server.js" (
    echo  Proje dosyalari bulunamadi.
    echo  GitHub'dan indiriliyor...
    
    git clone https://github.com/cihangirq/dosyatrans.git "%TEMP%\dosyatrans-temp"
    if %errorlevel% equ 0 (
        echo  Dosyalar kopyalaniyor...
        xcopy "%TEMP%\dosyatrans-temp\*" "." /E /Y /Q
        rmdir /S /Q "%TEMP%\dosyatrans-temp"
        echo  [TAMAM] Proje dosyalari indirildi!
    ) else (
        echo  [UYARI] Git ile indirme basarisiz, ZIP olarak deneyin...
        powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cihangirq/dosyatrans/archive/refs/heads/main.zip' -OutFile 'dosyatrans.zip'"
        if exist "dosyatrans.zip" (
            powershell -Command "Expand-Archive -Path 'dosyatrans.zip' -DestinationPath '%TEMP%\dosyatrans-extract' -Force"
            xcopy "%TEMP%\dosyatrans-extract\dosyatrans-main\*" "." /E /Y /Q
            del dosyatrans.zip
            rmdir /S /Q "%TEMP%\dosyatrans-extract"
            echo  [TAMAM] Proje dosyalari ZIP olarak indirildi!
        ) else (
            echo  [HATA] Proje dosyalari indirilemedi!
            echo  Lutfen https://github.com/cihangirq/dosyatrans adresinden indirin.
            pause
            exit /b 1
        )
    )
) else (
    echo  [OK] Proje dosyalari mevcut
)

:: ──────────────────────────────────────────────────────────────
:: 4. NPM BAGIMLILIKLARI
:: ──────────────────────────────────────────────────────────────
echo.
echo [4/5] Bagimliliklar yukleniyor...
if not exist "node_modules" (
    call npm install
    if %errorlevel% neq 0 (
        echo  [HATA] npm install basarisiz!
        echo  Node.js'in duzgun kurulup kurulmadigini kontrol edin.
        pause
        exit /b 1
    )
    echo  [TAMAM] Bagimliliklar yuklendi!
) else (
    echo  [OK] node_modules mevcut
)

:: ──────────────────────────────────────────────────────────────
:: 5. CLOUDFLARED KURULUMU
:: ──────────────────────────────────────────────────────────────
echo.
echo [5/5] Cloudflared (Cloudflare Tunnel) kuruluyor...
if exist "cloudflared.exe" (
    echo  [OK] cloudflared.exe zaten mevcut
) else (
    echo  Cloudflared indiriliyor...
    echo  Bu, bilgisayarinizi internete guvenli bir sekilde acan tunnel aracidir.
    echo  Ucretsiz ve sinirsizdir.
    echo.
    
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    
    if exist "cloudflared.exe" (
        echo  [TAMAM] cloudflared.exe indirildi!
    ) else (
        echo  [HATA] Cloudflared indirilemedi!
        echo.
        echo  Manuel kurulum:
        echo  1. https://github.com/cloudflare/cloudflared/releases adresine gidin
        echo  2. cloudflared-windows-amd64.exe indirin
        echo  3. Dosyayi bu klasore tasıyin ve cloudflared.exe olarak yeniden adlandirin
        echo.
    )
)

:: ──────────────────────────────────────────────────────────────
:: TAMAMLANDI
:: ──────────────────────────────────────────────────────────────
echo.
echo  ================================================================
echo                    KURULUM BASARILI!
echo  ================================================================
echo.
echo  Kurulan bilesenler:
echo   - Node.js: Dosya sunucusunu calistirmak icin
echo   - Cloudflared: Internet uzerinden erisim icin tunnel
echo   - Proje bagimliliklari: Socket.IO, Express, vb.
echo.
echo  SIMDI NE YAPMALISINIZ?
echo.
echo  1. baslat.bat dosyasini cift tiklayin
echo  2. Otomatik olarak sunucu ve tunnel baslar
echo  3. Arayuzde (http://localhost:3001) tunnel URL gorunur
echo  4. "Hazir Mesaji Kopyala" butonuna basin
echo  5. AI sohbetine yapistirin
echo.
echo  ================================================================
echo.

pause
