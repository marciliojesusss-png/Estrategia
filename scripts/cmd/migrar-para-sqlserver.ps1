$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

Push-Location $root
try {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($null -ne $python) {
    & $python.Source 'scripts\migrar-para-sqlserver.py' @args
    $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
  } else {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($null -eq $py) {
      Write-Host 'Python nao encontrado no PATH.'
      $exitCode = 1
    } else {
      & $py.Source 'scripts\migrar-para-sqlserver.py' @args
      $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    }
  }
} finally {
  Pop-Location
}

exit $exitCode
