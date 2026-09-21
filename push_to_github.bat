@echo off
setlocal enabledelayedexpansion
title Push Mstorage to GitHub - Mayank Mandrai
color 0b

echo ========================================================
echo   Mstorage Beta v1.0 - Automated GitHub Push Utility
echo   Repository: https://github.com/MAYANK10339/mstorage
echo   Creator and Lead Developer: Mayank Mandrai
echo   Engines: Direct Stream + Parallel Chunks (Beta) + XerVault
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Add Git directly to PATH to prevent space-path quoting errors
if exist "C:\Program Files\Git\cmd" set "PATH=C:\Program Files\Git\cmd;C:\Program Files\Git\bin;%PATH%"
if exist "C:\Program Files (x86)\Git\cmd" set "PATH=C:\Program Files (x86)\Git\cmd;C:\Program Files (x86)\Git\bin;%PATH%"
if exist "%LOCALAPPDATA%\Programs\Git\cmd" set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%LOCALAPPDATA%\Programs\Git\bin;%PATH%"

where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git executable was not found on your system.
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

:: 2. Identify Current Git Branch & Remote
set "BRANCH=main"
for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do (
    set "BRANCH=%%b"
)
if "!BRANCH!"=="" set "BRANCH=main"
echo [*] Active Branch: !BRANCH!

:: Ensure remote origin is configured
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Setting remote origin to https://github.com/MAYANK10339/mstorage.git ...
    git remote add origin https://github.com/MAYANK10339/mstorage.git
)

:: 3. Stage All File Changes
echo [*] Staging all files and assets...
git add -A

:: 4. Commit Changes If Any Exist
set "DEFAULT_MSG=Fix 1GB+ upload percentage fluctuation, infinite server socket timeout, and cache-busting v1.0.6"

git diff --cached --quiet
if %ERRORLEVEL% NEQ 0 (
    set "USER_MSG=%~1"
    if not defined USER_MSG (
        set "COMMIT_MSG=!DEFAULT_MSG!"
    ) else (
        set "COMMIT_MSG=!USER_MSG!"
    )
    echo [*] Committing changes: "!COMMIT_MSG!"
    git commit -m "!COMMIT_MSG!"
) else (
    echo [*] Working tree clean. Checking for unpushed commits...
)

:: 5. Push to GitHub Remote
echo.
echo [*] Pushing to origin/!BRANCH!...
git push origin !BRANCH!

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Successfully pushed all updates to GitHub!
    echo   Repository: https://github.com/MAYANK10339/mstorage
    echo   Branch: !BRANCH!
    echo.
    echo   [RENDER NOTICE] Render will automatically deploy the
    echo   latest updates in 1-2 minutes!
    echo ========================================================
) else (
    echo.
    echo [!] Standard push encountered an issue. Pulling latest rebase...
    git pull --rebase origin !BRANCH!
    echo [*] Retrying push to origin/!BRANCH!...
    git push origin !BRANCH!
    
    if !ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================================
        echo   [SUCCESS] Successfully rebased and pushed to GitHub!
        echo   Repository: https://github.com/MAYANK10339/mstorage
        echo ========================================================
    ) else (
        echo.
        echo ========================================================
        echo   [NOTE] Push encountered a connection or credential error.
        echo   Run: git push origin !BRANCH!
        echo ========================================================
    )
)

echo.
pause
