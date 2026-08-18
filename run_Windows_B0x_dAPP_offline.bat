@echo off
setlocal
cd /d "%~dp0"
set PORT=8000

netstat -ano | findstr ":%PORT% " | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo Server already running on port %PORT%. Opening browser...
    start "" "http://localhost:%PORT%/index.html"
    goto :eof
)

where py >nul 2>&1
if %errorlevel%==0 (
    set PYCMD=py -3
) else (
    set PYCMD=python
)

echo Starting local server on port %PORT% ...
start "Timelock Site Server (close this window to stop)" /min %PYCMD% -m http.server %PORT%

timeout /t 2 /nobreak >nul

start "" "http://localhost:%PORT%/index.html"

echo.
echo Site is running at http://localhost:%PORT%/
echo A minimized "Timelock Site Server" window is keeping it alive - close that window when you're done to stop the server.
