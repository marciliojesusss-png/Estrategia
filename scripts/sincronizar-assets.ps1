$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'assets'
$target = Join-Path $root 'public\assets'

Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force
Write-Host 'Assets sincronizados de assets/ para public/assets/.' -ForegroundColor Green
