@echo off
call npm install
call npm run dist
echo.
echo Готово. Смотри папку dist\  (установщик .exe и portable .zip)
pause
