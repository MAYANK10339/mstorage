@echo off
title Push Mstorage to GitHub
echo ========================================================
echo   Pushing Mstorage to https://github.com/MAYANK10339/mstorage
echo   Developer & Creator: Mayank Mandrai
echo ========================================================
echo.
cd /d "d:\XER MEDIA\Websites\Mstorage"
set PATH=C:\Program Files\Git\cmd;%PATH%
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Successfully pushed to https://github.com/MAYANK10339/mstorage !
) else (
    echo [NOTE] If prompted above, please complete GitHub sign-in in the browser window.
)
echo.
pause
