@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

title BefineSaaS - Run All
cd /d "%~dp0"

set "ROOT=%CD%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "BACKEND_URL=http://localhost:8081/api/health"
set "FRONTEND_URL=http://localhost:5173"

cls
echo =====================================================
echo              BEFINESAAS - RUN ALL
echo =====================================================
echo.

if not exist "%BACKEND%\gradlew.bat" (
    echo [ERROR] Cannot find backend\gradlew.bat
    echo Put this file in the project root folder, next to backend and frontend.
    pause
    exit /b 1
)

if not exist "%FRONTEND%\package.json" (
    echo [ERROR] Cannot find frontend\package.json
    echo Put this file in the project root folder, next to backend and frontend.
    pause
    exit /b 1
)

where java.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Java was not found.
    echo Install JDK 17 or newer, then reopen this file.
    pause
    exit /b 1
)

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found.
    echo Install Node.js LTS, then reopen this file.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm was not found.
    echo Reinstall Node.js LTS, then reopen this file.
    pause
    exit /b 1
)

echo [1/4] Checking MySQL...
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Port 3306 is not listening.
    echo           If backend cannot start, open MySQL first.
) else (
    echo [OK] MySQL port 3306 is listening.
)

echo.
echo [2/4] Starting backend...
call :PORT_IN_USE 8081
if errorlevel 1 (
    echo [INFO] Backend port 8081 is already in use. Skip starting another backend.
) else (
    start "BefineSaaS Backend" /D "%BACKEND%" cmd /k "call gradlew.bat bootRun"
    echo [OK] Backend window opened.
)

echo.
echo [3/4] Starting frontend...
call :PORT_IN_USE 5173
if errorlevel 1 (
    echo [INFO] Frontend port 5173 is already in use. Skip starting another frontend.
) else (
    if exist "%FRONTEND%\node_modules" (
        start "BefineSaaS Frontend" /D "%FRONTEND%" cmd /k "call npm.cmd run dev"
    ) else (
        start "BefineSaaS Frontend" /D "%FRONTEND%" cmd /k "call npm.cmd install && call npm.cmd run dev"
    )
    echo [OK] Frontend window opened.
)

echo.
echo [4/4] Waiting for services...
call :WAIT_FOR_URL "%BACKEND_URL%" 90 "Backend"
set "BACKEND_READY=!errorlevel!"

call :WAIT_FOR_URL "%FRONTEND_URL%" 90 "Frontend"
set "FRONTEND_READY=!errorlevel!"

echo.
if "!BACKEND_READY!"=="0" (
    echo [OK] Backend is online: %BACKEND_URL%
) else (
    echo [WARNING] Backend is not ready yet. Check the Backend window for details.
)

if "!FRONTEND_READY!"=="0" (
    echo [OK] Frontend is online: %FRONTEND_URL%
    echo.
    echo Opening BefineSaaS in your browser...
    start "" "%FRONTEND_URL%"
) else (
    echo [WARNING] Frontend is not ready yet. Check the Frontend window for details.
)

echo.
echo You may close this launcher window. Backend and Frontend will keep running.
timeout /t 6 /nobreak >nul
exit /b 0

:PORT_IN_USE
netstat -ano | findstr /R /C:":%~1 .*LISTENING" >nul 2>&1
if errorlevel 1 (exit /b 0) else (exit /b 1)

:WAIT_FOR_URL
set "CHECK_URL=%~1"
set /a "MAX_TRIES=%~2"
set "SERVICE_NAME=%~3"
set /a "TRY_COUNT=0"

:WAIT_LOOP
set /a "TRY_COUNT+=1"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%CHECK_URL%' -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0

if !TRY_COUNT! GEQ !MAX_TRIES! exit /b 1

if !TRY_COUNT! EQU 1 echo Waiting for %SERVICE_NAME%...
timeout /t 2 /nobreak >nul
goto WAIT_LOOP
