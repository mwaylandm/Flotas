
param(
    [string]$ServerIP = "52.91.243.25",
    [string]$KeyPath = "scripts/ServerUbuntuAquaflow.pem"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location

Write-Host "--- 1. DESPLEGANDO FLOTAS ABACUS ---" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "$ProjectRoot\scripts\deploy-fast.ps1" -ServerIP $ServerIP -KeyPath $KeyPath

Write-Host "--- 2. SUBIENDO SCRIPT DE RESTAURACION HTTP ---" -ForegroundColor Cyan
scp -i $KeyPath -o StrictHostKeyChecking=no "$ProjectRoot\scripts\setup_nginx.sh" ubuntu@${ServerIP}:~/restore-http.sh

Write-Host "--- 3. EJECUTANDO RESTAURACION HTTP ---" -ForegroundColor Cyan
ssh -i $KeyPath -o StrictHostKeyChecking=no ubuntu@${ServerIP} "chmod +x ~/restore-http.sh && ~/restore-http.sh"

Write-Host "--- LISTO: ACCEDE A http://${ServerIP}/ ---" -ForegroundColor Green
