$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

function Resolve-PhpExecutable {
  if ($env:PHP_EXE -and $env:PHP_EXE.Trim() -ne '') {
    if (Test-Path $env:PHP_EXE -PathType Leaf) {
      return (Resolve-Path $env:PHP_EXE).Path
    }
    $command = Get-Command $env:PHP_EXE -ErrorAction SilentlyContinue
    if ($null -ne $command) {
      return $command.Source
    }
    throw "PHP_EXE nao encontrado: $env:PHP_EXE"
  }

  return (Get-Command php -ErrorAction Stop).Source
}

$php = Resolve-PhpExecutable
Write-Host "Executavel PHP: $php"

Push-Location $root
try {
  & $php 'scripts\diagnostico-servidor.php' @args
  $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
} finally {
  Pop-Location
}

exit $exitCode
