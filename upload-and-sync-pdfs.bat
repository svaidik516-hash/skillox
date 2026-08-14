@echo off
echo =======================================
echo     Skillox PDF Auto-Uploader
echo =======================================
echo.
echo 1. Uploading PDFs to Supabase...
node scripts\upload-pdfs.js
echo.
echo 2. Updating website PDF menus...
node scripts\generate-pdf-list.js
echo.
echo =======================================
echo     All Done! 
echo =======================================
pause
