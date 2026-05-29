@echo off
setlocal
set "SOURCE_ENV_FILE=%CD%\.env"
set "RAILWAY_DATABASE_URL=postgresql://postgres:ikCkzxfabErLidKTIrrKRqjTZUMDVwom@zephyr.proxy.rlwy.net:37218/railway"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0migrate_neon_to_railway.ps1"
exit /b %errorlevel%
