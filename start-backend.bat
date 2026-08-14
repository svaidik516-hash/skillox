@echo off
title Skillox Backend Server
echo.
echo  ================================================
echo   SKILLOX BACKEND - Local Server + ngrok Tunnel
echo  ================================================
echo.

:: Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [!] ngrok is NOT installed.
    echo.
    echo  To install ngrok:
    echo    1. Go to https://ngrok.com/download
    echo    2. Sign up for a free account
    echo    3. Download ngrok for Windows
    echo    4. Extract ngrok.exe to a folder in your PATH
    echo    5. Run: ngrok config add-authtoken YOUR_TOKEN
    echo.
    echo  After installing, run this script again.
    echo.
    pause
    exit /b 1
)

echo  [1/2] Starting Express server on port 3000...
start /B cmd /c "node server.js"
timeout /t 2 /nobreak >nul

echo  [2/2] Starting ngrok tunnel...
echo.
echo  -----------------------------------------------
echo   Your PUBLIC URL will appear below.
echo   Copy it and paste into config.js as:
echo.
echo     const API_BASE_URL = 'https://YOUR-URL.ngrok-free.app';
echo.
echo   Then redeploy your Vercel site.
echo  -----------------------------------------------
echo.

ngrok http 3000
