@echo off
:: ═══════════════════════════════════════════════════════════════
:: OLYMPUS GOVERNANCE DAEMON - Windows Startup Script
:: ═══════════════════════════════════════════════════════════════
:: This script starts the governance daemon with PM2
:: Run at Windows startup via Task Scheduler
:: ═══════════════════════════════════════════════════════════════

title OLYMPUS Governance Daemon

:: Set paths
set PROJECT_PATH=C:\Users\SBS\Desktop\OLYMPUS\OLYMPUS
set LOG_PATH=%PROJECT_PATH%\logs\governance

:: Create log directory if not exists
if not exist "%LOG_PATH%" mkdir "%LOG_PATH%"

:: Log startup
echo [%date% %time%] Starting OLYMPUS Governance Daemon... >> "%LOG_PATH%\startup.log"

:: Change to project directory
cd /d "%PROJECT_PATH%"

:: Check if PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo PM2 not found. Installing globally...
    call npm install -g pm2
    call npm install -g pm2-windows-startup
)

:: Stop existing daemon if running
call pm2 delete olympus-governance >nul 2>nul

:: Start the daemon with PM2
echo Starting governance daemon with PM2...
call pm2 start ecosystem.config.js --only olympus-governance

:: Save PM2 process list (for auto-restart)
call pm2 save

:: Log success
echo [%date% %time%] Governance Daemon started successfully >> "%LOG_PATH%\startup.log"

:: Show status
call pm2 status

echo.
echo ═══════════════════════════════════════════════════════════════
echo   OLYMPUS Governance Daemon is now running!
echo   - Claude Code Integration: ENABLED
echo   - Monitoring: 24/7
echo   - Logs: %LOG_PATH%
echo ═══════════════════════════════════════════════════════════════
echo.
echo Commands:
echo   pm2 logs olympus-governance    - View live logs
echo   pm2 status                     - Check status
echo   pm2 restart olympus-governance - Restart daemon
echo   pm2 stop olympus-governance    - Stop daemon
echo.
