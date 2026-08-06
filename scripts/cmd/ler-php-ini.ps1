$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

Push-Location $root
try {
  & 'scripts\ler-php-ini.ps1' @args
  $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
} finally {
  Pop-Location
}

exit $exitCode
