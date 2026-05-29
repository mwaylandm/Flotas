@echo off
TITLE Sistema Cascada - Panel de Control
COLOR 0A
CLS

echo ========================================================
echo               SISTEMA DE GESTION CASCADA
echo ========================================================
echo.

REM Verificar Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    COLOR 0C
    echo [ERROR] Node.js no se encuentra instalado.
    echo Por favor instale Node.js desde https://nodejs.org/
    echo.
    pause
    exit /b
)

REM Ir al directorio del script
cd /d "%~dp0"

REM Verificar Dependencias
IF NOT EXIST "node_modules" (
    echo [1/3] Instalando dependencias necesarias...
    echo       Esto puede tardar unos minutos la primera vez.
    call npm install --legacy-peer-deps
) ELSE (
    echo [1/3] Verificando dependencias... OK
)

REM Configurar Base de Datos
echo [2/3] Sincronizando base de datos...
call npx prisma generate >nul
call npx prisma db push >nul
echo       Base de datos... OK

REM Iniciar Servidor
echo [3/3] Iniciando servidor...
echo.
echo ========================================================
echo    El sistema esta listo.
echo    Acceda a: http://localhost:3000
echo    (No cierre esta ventana mientras use el sistema)
echo ========================================================
echo.

call npm run dev
