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

  $php = Get-Command php -ErrorAction SilentlyContinue
  if ($null -ne $php) {
    return $php.Source
  }

  $patterns = @(
    'C:\php\php.exe',
    'C:\Sistemas\toolsphp*\php*\php.exe',
    'C:\Sistemas\php*\php.exe',
    'C:\tools\php*\php.exe',
    'C:\Program Files\PHP\*\php.exe',
    'C:\Program Files (x86)\PHP\*\php.exe'
  )

  foreach ($pattern in $patterns) {
    $matches = @(Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)
    if ($matches.Count -gt 0) {
      return $matches[0].FullName
    }
  }

  throw 'php.exe nao encontrado. Configure PHP_EXE com o caminho completo do PHP do servidor.'
}

$php = Resolve-PhpExecutable
Write-Host "Executavel PHP: $php"

Push-Location $root
try {
  & $php 'scripts\diagnostico-sqlserver.php' @args
  $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
} finally {
  Pop-Location
}

exit $exitCode
