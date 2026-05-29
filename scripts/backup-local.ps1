$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$BackupDir = "$ProjectRoot\backups\$Timestamp"

# Create backup directory
New-Item -ItemType Directory -Path $BackupDir | Out-Null
Write-Host "--- Iniciando respaldo completo local ---" -ForegroundColor Cyan
Write-Host "Directorio de destino: $BackupDir" -ForegroundColor Gray

# Folders to backup
$Folders = @("app", "components", "lib", "prisma", "public", "scripts", "hooks")
foreach ($Folder in $Folders) {
    if (Test-Path "$ProjectRoot\$Folder") {
        Write-Host "Copiando $Folder..." -ForegroundColor Yellow
        Copy-Item -Path "$ProjectRoot\$Folder" -Destination "$BackupDir\$Folder" -Recurse
    }
}

# Files to backup
$Files = @(".env", "package.json", "next.config.js", "tsconfig.json", "tailwind.config.ts", "postcss.config.js", ".eslintrc.json")
foreach ($File in $Files) {
    if (Test-Path "$ProjectRoot\$File") {
        Write-Host "Copiando $File..." -ForegroundColor Yellow
        Copy-Item -Path "$ProjectRoot\$File" -Destination "$BackupDir\$File"
    }
}

Write-Host "--- Respaldo completado ---" -ForegroundColor Cyan
Write-Host "Respaldo guardado en: $BackupDir" -ForegroundColor Green
