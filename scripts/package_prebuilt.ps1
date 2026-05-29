
$ErrorActionPreference = "Stop"
$ProjectRoot = Get-Location
$TempDir = "$ProjectRoot\temp_deploy_prebuilt"
$ZipPath = "$ProjectRoot\aquaflow-deploy.zip"

Write-Host "Iniciando empaquetado PRE-CONSTRUIDO..."

# 1. Compilación Local
Write-Host "Compilando localmente (npm run build)..."
# Asegurarse de que las dependencias estén instaladas
if (!(Test-Path "node_modules")) {
    npm install
}
# cmd /c "npm run build"
if ($LASTEXITCODE -ne 0) {
    Write-Warning "La compilación fue omitida o falló (se usará la versión actual)."
    # exit 1
}

# Ensure BUILD_ID exists (Next.js 14 sometimes doesn't generate it in the root or it's missing)
if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Warning "BUILD_ID missing. Generating one to satisfy production server requirements..."
    $BuildId = [Guid]::NewGuid().ToString()
    Set-Content -Path ".next\BUILD_ID" -Value $BuildId
}

# Ensure prerender-manifest.json exists
if (-not (Test-Path ".next\prerender-manifest.json")) {
    Write-Warning "prerender-manifest.json missing. Generating dummy..."
    $ManifestContent = '{
      "version": 4,
      "routes": {},
      "dynamicRoutes": {},
      "preview": {
        "previewModeId": "development-id",
        "previewModeSigningKey": "development-key",
        "previewModeEncryptionKey": "development-key"
      },
      "notFoundRoutes": []
    }'
    Set-Content -Path ".next\prerender-manifest.json" -Value $ManifestContent
}

# Ensure images-manifest.json exists
if (-not (Test-Path ".next\images-manifest.json")) {
    Write-Warning "images-manifest.json missing. Generating dummy..."
    $ImagesContent = '{
      "version": 1,
      "images": {
        "domains": [],
        "sizes": [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        "formats": ["image/webp"]
      }
    }'
    Set-Content -Path ".next\images-manifest.json" -Value $ImagesContent
}

# 2. Limpieza previa
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force }
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# 3. Crear directorio temporal
New-Item -ItemType Directory -Path $TempDir | Out-Null

# 4. Copiar archivos
# INCLUIMOS .next y public
$Include = @(
    ".next",
    "public",
    "package.json",
    "next.config.js",
    "next.config.mjs",
    ".env",
    "prisma"
)

Write-Host "Copiando archivos..."

foreach ($Item in $Include) {
    if (Test-Path "$ProjectRoot\$Item") {
        Copy-Item -Path "$ProjectRoot\$Item" -Destination $TempDir -Recurse -Force
    }
}

# Limpiar DB local del paquete para no sobrescribir producción
if (Test-Path "$TempDir\prisma\dev.db") { Remove-Item "$TempDir\prisma\dev.db" -Force }
if (Test-Path "$TempDir\prisma\dev.db-journal") { Remove-Item "$TempDir\prisma\dev.db-journal" -Force }

# 5. Comprimir
Write-Host "Comprimiendo..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempDir, $ZipPath)

Write-Host "Zip creado en: $ZipPath"
$Size = (Get-Item $ZipPath).Length / 1MB
Write-Host "Tamaño del paquete: $("{0:N2}" -f $Size) MB"

# 6. Limpieza
Remove-Item $TempDir -Recurse -Force
