param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    [Parameter(Mandatory=$true)]
    [string]$KeyPath
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location

Write-Host "--- 1. EMPAQUETADO DE ARTEFACTOS ---" -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "$ProjectRoot\scripts\package_artifacts.ps1"

Write-Host "--- 2. SUBIENDO ARCHIVOS ---" -ForegroundColor Cyan
Write-Host "Subiendo artefactos..."
scp -i $KeyPath -o StrictHostKeyChecking=no "$ProjectRoot\aquaflow-artifacts.zip" ubuntu@${ServerIP}:~/aquaflow-artifacts.zip

Write-Host "Subiendo script de actualización..."
scp -i $KeyPath -o StrictHostKeyChecking=no "$ProjectRoot\scripts\update-server-artifacts.sh" ubuntu@${ServerIP}:~/update-server-artifacts.sh

Write-Host "--- 3. APLICANDO ACTUALIZACION EN SERVIDOR ---" -ForegroundColor Cyan
ssh -i $KeyPath -o StrictHostKeyChecking=no ubuntu@${ServerIP} "chmod +x ~/update-server-artifacts.sh && ~/update-server-artifacts.sh"

Write-Host "--- ¡DESPLIEGUE FINALIZADO! ---" -ForegroundColor Green
