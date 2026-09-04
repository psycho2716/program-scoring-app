@echo off
REM Starts backend + frontend (used by Windows Startup).
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-servers.ps1"
