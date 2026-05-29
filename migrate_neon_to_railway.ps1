$ErrorActionPreference = "Stop"

function Get-PgTool {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ToolName
  )

  $command = Get-Command $ToolName -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\PostgreSQL\18\bin\$ToolName.exe",
    "C:\Program Files\PostgreSQL\17\bin\$ToolName.exe",
    "C:\Program Files\PostgreSQL\16\bin\$ToolName.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  Write-Host "No se encontraron herramientas PostgreSQL ($ToolName)." -ForegroundColor Yellow
  Write-Host "Instalando PostgreSQL 18..." -ForegroundColor Yellow
  winget install -e --id PostgreSQL.PostgreSQL.18 --silent --accept-package-agreements --accept-source-agreements

  $installed = "C:\Program Files\PostgreSQL\18\bin\$ToolName.exe"
  if (Test-Path $installed) {
    return $installed
  }

  throw "No se pudo localizar $ToolName.exe"
}

function Get-RequiredValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$EnvName,
    [Parameter(Mandatory = $true)]
    [string]$Prompt
  )

  $value = [Environment]::GetEnvironmentVariable($EnvName, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    $value = Read-Host $Prompt
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Falta el valor requerido: $EnvName"
  }

  return $value.Trim()
}

function Get-RequiredSecret {
  param(
    [Parameter(Mandatory = $true)]
    [string]$EnvName,
    [Parameter(Mandatory = $true)]
    [string]$Prompt
  )

  $value = [Environment]::GetEnvironmentVariable($EnvName, "Process")
  if ([string]::IsNullOrWhiteSpace($value)) {
    $secure = Read-Host $Prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
      $value = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
  }

  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Falta el secreto requerido: $EnvName"
  }

  return $value
}

function Get-DotEnvValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string]$Key
  )

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  foreach ($line in Get-Content -Path $FilePath) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) {
      continue
    }

    if ($trimmed -match "^\s*$([Regex]::Escape($Key))\s*=\s*(.*)\s*$") {
      $value = $Matches[1].Trim()
      if (
        ($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))
      ) {
        $value = $value.Substring(1, $value.Length - 2)
      }
      return $value.Trim()
    }
  }

  return $null
}

function Get-SourceEnvFile {
  $candidates = @()

  if (-not [string]::IsNullOrWhiteSpace($env:SOURCE_ENV_FILE)) {
    $candidates += $env:SOURCE_ENV_FILE
  }

  $cwdEnv = Join-Path (Get-Location) ".env"
  $scriptEnv = Join-Path $PSScriptRoot ".env"

  $candidates += $cwdEnv
  $candidates += $scriptEnv

  foreach ($candidate in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  return $null
}

function Get-DatabaseUrlFromEnvFile {
  $envFile = Get-SourceEnvFile
  if (-not $envFile) {
    return $null
  }

  $databaseUrl = Get-DotEnvValue -FilePath $envFile -Key "DATABASE_URL"
  if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    return $null
  }

  if (-not $databaseUrl.StartsWith("postgresql://")) {
    throw "El DATABASE_URL encontrado en $envFile no es PostgreSQL."
  }

  Write-Host "Usando DATABASE_URL desde: $envFile" -ForegroundColor DarkCyan
  return $databaseUrl
}

function Build-DatabaseUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$UrlWithoutPassword,
    [Parameter(Mandatory = $true)]
    [string]$Password
  )

  $uri = [System.Uri]$UrlWithoutPassword
  if ([string]::IsNullOrWhiteSpace($uri.UserInfo)) {
    throw "La URL no incluye usuario: $UrlWithoutPassword"
  }

  $user = $uri.UserInfo.Split(":")[0]
  $builder = New-Object System.UriBuilder($uri)
  $builder.UserName = $user
  $builder.Password = $Password
  return $builder.Uri.AbsoluteUri
}

function Get-NeonDatabaseUrl {
  $databaseUrl = [Environment]::GetEnvironmentVariable("NEON_DATABASE_URL", "Process")
  if (-not [string]::IsNullOrWhiteSpace($databaseUrl)) {
    return $databaseUrl.Trim()
  }

  $databaseUrl = Get-DatabaseUrlFromEnvFile
  if (-not [string]::IsNullOrWhiteSpace($databaseUrl)) {
    return $databaseUrl
  }

  $neonUrl = Get-RequiredValue -EnvName "NEON_URL_NO_PW" -Prompt "NEON_URL_NO_PW sin password"
  $neonPassword = Get-RequiredSecret -EnvName "NEON_PGPASSWORD" -Prompt "Password Neon"
  return Build-DatabaseUrl -UrlWithoutPassword $neonUrl -Password $neonPassword
}

function Get-RailwayDatabaseUrl {
  $databaseUrl = [Environment]::GetEnvironmentVariable("RAILWAY_DATABASE_URL", "Process")
  if (-not [string]::IsNullOrWhiteSpace($databaseUrl)) {
    return $databaseUrl.Trim()
  }

  $railwayUrl = Get-RequiredValue -EnvName "RAILWAY_URL_NO_PW" -Prompt "RAILWAY_URL_NO_PW sin password"
  $railwayPassword = Get-RequiredSecret -EnvName "RAILWAY_PGPASSWORD" -Prompt "Password Railway"
  return Build-DatabaseUrl -UrlWithoutPassword $railwayUrl -Password $railwayPassword
}

$pgDump = Get-PgTool -ToolName "pg_dump"
$psql = Get-PgTool -ToolName "psql"
$pgRestore = Get-PgTool -ToolName "pg_restore"

$neonUrl = Get-NeonDatabaseUrl
$railwayUrl = Get-RailwayDatabaseUrl

$dumpFile = Join-Path $PSScriptRoot "neon_full.dump"

Write-Host "Probando conexión a Neon..." -ForegroundColor Cyan
& $psql $neonUrl -v ON_ERROR_STOP=1 -c "select current_user, current_database();"

Write-Host "Generando dump completo desde Neon..." -ForegroundColor Cyan
if (Test-Path $dumpFile) {
  Remove-Item $dumpFile -Force
}
& $pgDump $neonUrl -Fc --verbose --no-owner --no-privileges -f $dumpFile

if (-not (Test-Path $dumpFile)) {
  throw "No se generó el archivo dump."
}

Write-Host "Probando conexión a Railway..." -ForegroundColor Cyan
& $psql $railwayUrl -v ON_ERROR_STOP=1 -c "select current_user, current_database();"

Write-Host "Limpiando schema public en Railway..." -ForegroundColor Cyan
& $psql $railwayUrl -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

Write-Host "Restaurando dump en Railway..." -ForegroundColor Cyan
& $pgRestore -d $railwayUrl --verbose --no-owner --no-privileges $dumpFile

Write-Host "Verificando tablas en Railway..." -ForegroundColor Cyan
& $psql $railwayUrl -v ON_ERROR_STOP=1 -c "\dt"

Write-Host ""
Write-Host "Migración completada." -ForegroundColor Green
Write-Host "Dump generado en: $dumpFile" -ForegroundColor Green
