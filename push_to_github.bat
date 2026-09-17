@echo off
setlocal enabledelayedexpansion
title Push Mstorage to GitHub

echo ========================================================
echo   Pushing Mstorage to GitHub
echo   Repository: https://github.com/MAYANK10339/mstorage
echo   Developer and Creator: Mayank Mandrai
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

echo [*] Staging all updated files...
"%GIT_CMD%" add .

echo [*] Checking commit status...
"%GIT_CMD%" commit -m "Update Mstorage: Edit & Replace files, isolated public download mode, and smooth UI" >nul 2>&1

echo [*] Pushing to origin main branch...
echo [INFO] If a browser window opens, please click 'Sign in with your browser' to authorize.
echo.

"%GIT_CMD%" push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Successfully pushed to:
    echo   https://github.com/MAYANK10339/mstorage
    echo ========================================================
) else (
    echo.
    echo [NOTE] If the push failed due to authentication, please run:
    echo        git push -u origin main
    echo in your terminal and authorize GitHub in your browser.
)

echo.
pause
