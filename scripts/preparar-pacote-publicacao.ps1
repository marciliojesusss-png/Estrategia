param([string]$Destino = (Join-Path (Split-Path -Parent $PSScriptRoot) 'storage\temporarios'))

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$version = Get-Date -Format 'yyyyMMdd-HHmmss'
$stage = Join-Path $Destino "estrategia-$version"
$zip = "$stage.zip"
New-Item -ItemType Directory -Force -Path $stage | Out-Null
foreach ($item in @('app', 'api', 'assets', 'public', 'views', 'uploads', 'database\sqlserver', 'docs', 'scripts', 'README.md', 'migrar-para-sqlserver.bat')) {
    $source = Join-Path $root $item
    if (Test-Path $source) { Copy-Item $source -Destination $stage -Recurse -Force }
}
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Write-Host "Pacote criado: $zip" -ForegroundColor Green
Write-Warning 'Revise o pacote e anexe hash/versao ao aceite antes da publicacao.'
