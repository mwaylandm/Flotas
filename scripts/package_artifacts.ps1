
$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$TempDir = "$ProjectRoot\temp_deploy_artifacts"
$ZipPath = "$ProjectRoot\aquaflow-artifacts.zip"

Write-Host "Iniciando empaquetado de artefactos pre-construidos..."

# Limpieza previa
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Crear directorio temporal
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copiar archivos necesarios para producción
$FilesToCopy = @(
    "package.json",
    "package-lock.json",
    "next.config.js",
    "public",
    ".next",
    "prisma",
    ".env" 
)

foreach ($File in $FilesToCopy) {
    if (Test-Path "$ProjectRoot\$File") {
        Copy-Item -Path "$ProjectRoot\$File" -Destination $TempDir -Recurse -Force
    } else {
        Write-Warning "Archivo no encontrado: $File"
    }
}

# Limpiar DB local del paquete si se copió accidentalmente
if (Test-Path "$TempDir\prisma\dev.db") { Remove-Item "$TempDir\prisma\dev.db" -Force }
if (Test-Path "$TempDir\prisma\dev.db-journal") { Remove-Item "$TempDir\prisma\dev.db-journal" -Force }

# Comprimir
Write-Host "Comprimiendo..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $ZipPath)

Write-Host "Zip creado en: $ZipPath"
$Size = (Get-Item $ZipPath).Length / 1MB
Write-Host "Tamaño del paquete: $("{0:N2}" -f $Size) MB"

# Limpieza
Remove-Item $TempDir -Recurse -Force
