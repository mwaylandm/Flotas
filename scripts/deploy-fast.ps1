param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    [Parameter(Mandatory=$true)]
    [string]$KeyPath
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location

Write-Host "--- 1. EMPAQUETADO RAPIDO ---" -ForegroundColor Cyan
# Ejecutamos el empaquetado optimizado
powershell -ExecutionPolicy Bypass -File "$ProjectRoot\scripts\package_fast.ps1"

Write-Host "--- 2. SUBIENDO ARCHIVOS ---" -ForegroundColor Cyan
# Subir ZIP
Write-Host "Subiendo código..."
scp -i $KeyPath -o StrictHostKeyChecking=no "$ProjectRoot\aquaflow-deploy.zip" ubuntu@${ServerIP}:~/aquaflow-deploy.zip

# Subir Script de Actualización
Write-Host "Subiendo script de actualización..."
scp -i $KeyPath -o StrictHostKeyChecking=no "$ProjectRoot\scripts\update-server.sh" ubuntu@${ServerIP}:~/update-server.sh

Write-Host "--- 3. APLICANDO ACTUALIZACION EN SERVIDOR ---" -ForegroundColor Cyan
ssh -i $KeyPath -o StrictHostKeyChecking=no ubuntu@${ServerIP} "chmod +x ~/update-server.sh && ~/update-server.sh"

Write-Host "--- ¡DESPLIEGUE FINALIZADO! ---" -ForegroundColor Green
