$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = "$ProjectRoot\backups\${Timestamp}_LocalFull"

Write-Host "--- INICIANDO RESPALDO LOCAL COMPLETO ---" -ForegroundColor Cyan
Write-Host "Destino: $BackupDir"

# 1. Crear directorio
New-Item -ItemType Directory -Path $BackupDir | Out-Null

# 2. Respaldar Base de Datos
Write-Host "1. Copiando bases de datos..." -ForegroundColor Yellow
if (Test-Path "$ProjectRoot\prisma\dev.db") {
    Copy-Item "$ProjectRoot\prisma\dev.db" "$BackupDir\dev.db"
    Write-Host "   - dev.db copiada." -ForegroundColor Green
} else {
    Write-Warning "   - No se encontró dev.db"
}


# 3. Respaldar Código Fuente (Zip)
Write-Host "2. Empaquetando código fuente..." -ForegroundColor Yellow
$ZipPath = "$BackupDir\source_code.zip"
$TempDir = "$ProjectRoot\temp_backup_$Timestamp"

# Crear temp
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Exclusiones
$Exclude = @(
    "node_modules", 
    ".next", 
    ".git", 
    "backups", 
    "dist", 
    "temp_deploy",
    "cascada-deploy.zip",
    "temp_backup_$Timestamp"
)

# Copiar archivos al temp
Get-ChildItem -Path $ProjectRoot -Force | Where-Object { $Exclude -notcontains $_.Name } | Copy-Item -Destination $TempDir -Recurse

# Comprimir
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $ZipPath)

# Limpiar temp
Remove-Item $TempDir -Recurse -Force

Write-Host "   - Código comprimido en source_code.zip" -ForegroundColor Green

Write-Host "--- RESPALDO COMPLETADO EXITOSAMENTE ---" -ForegroundColor Cyan
Write-Host "Ubicación: $BackupDir" -ForegroundColor Green
