$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

Push-Location $root
try {
  & 'scripts\servidor.ps1' reiniciar -Background -OpenBrowser @args
  $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
} finally {
  Pop-Location
}

exit $exitCode
