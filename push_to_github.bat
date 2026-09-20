@echo off
setlocal enabledelayedexpansion
title Push Mstorage to GitHub - Mayank Mandrai
color 0b

echo ========================================================
echo   Mstorage Beta v1.0 - Automated GitHub Push Utility
echo   Repository: https://github.com/MAYANK10339/mstorage
echo   Creator and Lead Developer: Mayank Mandrai
echo   Engines: Direct Stream + Parallel Chunks (Beta) + XerVault
echo   Visuals: 3 Dynamic Themes + Optical Liquid Glass Mode
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Detect Git Executable Path
set "GIT_CMD=git"
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Program Files\Git\bin\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\bin\git.exe"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    ) else (
        echo [ERROR] Git executable was not found on your system.
        echo Please ensure Git is installed from https://git-scm.com/
        pause
        exit /b 1
    )
)

:: 2. Identify Current Git Branch
set "BRANCH=main"
for /f "tokens=*" %%b in ('"%GIT_CMD%" rev-parse --abbrev-ref HEAD 2^>nul') do (
    set "BRANCH=%%b"
)
echo [*] Active Branch: !BRANCH!

:: 3. Stage All File Changes
echo [*] Staging updated files and assets...
"%GIT_CMD%" add .

:: 4. Commit Message Setup
set "DEFAULT_MSG=Update Mstorage Beta v1.0: 3 Themes (Midnight, Ice Blue, Aurora), Standalone Liquid Glass Toggle, Folder Auto-Zip, Download Crash Resilience & Architecture Spotlight"

:: Check if user passed commit message as command-line argument
set "USER_MSG=%~1"
if not defined USER_MSG (
    set /p "USER_MSG=Enter commit message (Press ENTER for default): "
)

if not defined USER_MSG (
    set "COMMIT_MSG=!DEFAULT_MSG!"
) else (
    set "COMMIT_MSG=!USER_MSG!"
)

echo [*] Committing with message: "!COMMIT_MSG!"
"%GIT_CMD%" commit -m "!COMMIT_MSG!" >nul 2>&1

:: 5. Push to GitHub Remote
echo.
echo [*] Pushing commits to origin/!BRANCH!...
echo [INFO] If GitHub browser authentication opens, approve to continue.
echo.

"%GIT_CMD%" push -u origin !BRANCH!

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo   [SUCCESS] Successfully pushed all updates to GitHub!
    echo   Repository: https://github.com/MAYANK10339/mstorage
    echo   Branch: !BRANCH!
    echo ========================================================
) else (
    echo.
    echo [!] Standard push encountered an issue. Attempting pull --rebase...
    "%GIT_CMD%" pull --rebase origin !BRANCH!
    echo [*] Retrying push to origin/!BRANCH!...
    "%GIT_CMD%" push -u origin !BRANCH!
    
    if !ERRORLEVEL! EQU 0 (
        echo.
        echo ========================================================
        echo   [SUCCESS] Successfully rebased and pushed to GitHub!
        echo   Repository: https://github.com/MAYANK10339/mstorage
        echo ========================================================
    ) else (
        echo.
        echo ========================================================
        echo   [NOTE] Push could not complete automatically.
        echo   Please verify your network connection and GitHub credentials,
        echo   or run: git push -u origin !BRANCH!
        echo ========================================================
    )
)

echo.
pause
