
$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$TempDir = "$ProjectRoot\temp_deploy_fast"
$ZipPath = "$ProjectRoot\aquaflow-deploy.zip"

Write-Host "Iniciando empaquetado optimizado (Fast Mode - ZIP)..."

# Limpieza previa
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
$TarPath = "$ProjectRoot\aquaflow-deploy.tar.gz"
if (Test-Path $TarPath) { Remove-Item $TarPath -Force }

# Crear directorio temporal
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copiar archivos
# EXCLUIMOS .next porque compilamos en el servidor
$Exclude = @(
    "node_modules", 
    ".next",
    ".git", 
    "temp_deploy", 
    "temp_deploy_v2", 
    "temp_deploy_v3", 
    "temp_deploy_v4", 
    "temp_deploy_fast",
    "test_unzip",
    "backups", 
    "cascada-deploy.zip",
    "aquaflow-deploy.zip",
    "aquaflow-deploy.tar.gz",
    "dist", 
    ".vscode",
    ".idea"
)

Write-Host "Copiando archivos..."
Get-ChildItem -Path $ProjectRoot -Force | Where-Object { $Exclude -notcontains $_.Name } | Copy-Item -Destination $TempDir -Recurse

# Limpiar DB local del paquete
# if (Test-Path "$TempDir\prisma\dev.db") { Remove-Item "$TempDir\prisma\dev.db" -Force }
if (Test-Path "$TempDir\prisma\dev.db-journal") { Remove-Item "$TempDir\prisma\dev.db-journal" -Force }

# Remove extra backup files from prisma
Get-ChildItem -Path "$TempDir\prisma" | Where-Object { $_.Name -ne "dev.db" -and $_.Name -ne "schema.prisma" } | Remove-Item -Force

# Comprimir usando ZIP
Write-Host "Comprimiendo con ZIP..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $ZipPath)

Write-Host "Paquete creado en: $ZipPath"
$Size = (Get-Item $ZipPath).Length / 1MB
Write-Host "Tamaño del paquete: $("{0:N2}" -f $Size) MB"

# Limpieza
Remove-Item $TempDir -Recurse -Force
