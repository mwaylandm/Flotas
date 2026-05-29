param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    [Parameter(Mandatory=$true)]
    [string]$KeyPath
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = "$ProjectRoot\backups\$Timestamp"

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir | Out-Null
Write-Host "--- Iniciando respaldo de base de datos desde $ServerIP ---" -ForegroundColor Cyan
Write-Host "Directorio de destino: $BackupDir" -ForegroundColor Gray

# Download dev.db
Write-Host "Descargando dev.db..." -ForegroundColor Yellow
try {
    scp -i $KeyPath -o StrictHostKeyChecking=no ubuntu@${ServerIP}:/home/ubuntu/aquaflow/prisma/dev.db "$BackupDir\dev.db"
    Write-Host "¡dev.db descargado correctamente!" -ForegroundColor Green
} catch {
    Write-Error "Error al descargar dev.db: $_"
}

# Download dev.db-journal (if exists)
Write-Host "Verificando journal..." -ForegroundColor Yellow
try {
    scp -i $KeyPath -o StrictHostKeyChecking=no ubuntu@${ServerIP}:/home/ubuntu/aquaflow/prisma/dev.db-journal "$BackupDir\dev.db-journal" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "dev.db-journal descargado (había transacciones activas)." -ForegroundColor Gray
    } else {
        Write-Host "No se encontró archivo journal (la BD está en reposo, es normal)." -ForegroundColor Gray
    }
} catch {
    # Ignore error if journal doesn't exist
}

Write-Host "--- Respaldo completado ---" -ForegroundColor Cyan
Write-Host "Puedes encontrar tu base de datos en: $BackupDir" -ForegroundColor Green
