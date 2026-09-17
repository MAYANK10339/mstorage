@echo off
setlocal enabledelayedexpansion
title Push Mstorage to GitHub
color 0b

echo ========================================================
echo   Mstorage PRO - Automated GitHub Push Utility
echo   Repository: https://github.com/MAYANK10339/mstorage
echo   Creator and Lead Developer: Mayank Mandrai
echo   Latest Engine: XerEngine v5.0 Turbo + Adsterra Ads
echo ========================================================
echo.

cd /d "%~dp0"

set "GIT_CMD=git"
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    ) else (
        echo [ERROR] Git was not found in standard paths.
        echo Please make sure Git is installed.
        pause
        exit /b 1
    )
)

echo [*] Staging updated files...
"%GIT_CMD%" add .

echo [*] Committing latest changes...
"%GIT_CMD%" commit -m "Update Mstorage: Add 300x250 Adsterra clean banner unit for download page and mobile view" >nul 2>&1

echo [*] Pushing to origin main branch...
echo [INFO] If a GitHub authentication prompt appears, authorize in your browser.
echo.

"%GIT_CMD%" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Successfully pushed all updates to GitHub!
    echo   https://github.com/MAYANK10339/mstorage
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [NOTE] If push failed or was rejected, please check network
    echo          or run: git push -u origin main
    echo ========================================================
)

echo.
pause
