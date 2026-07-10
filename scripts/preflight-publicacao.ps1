param([string]$PhysicalPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'public'))

$ErrorActionPreference = 'Stop'
$problems = @()
$phpVersion = & php -r "echo PHP_VERSION;"
if ($phpVersion -ne '7.1.19') { $problems += "PHP esperado 7.1.19; encontrado $phpVersion" }
if ((& php -r "echo extension_loaded('pdo_sqlsrv') ? 'yes' : 'no';") -ne 'yes') { $problems += 'Extensao pdo_sqlsrv ausente' }
foreach ($file in @('index.php', 'web.config')) {
    if (!(Test-Path (Join-Path $PhysicalPath $file))) { $problems += "Arquivo ausente no public: $file" }
}
foreach ($dir in @('storage\logs', 'storage\uploads', 'storage\temporarios')) {
    if (!(Test-Path (Join-Path (Split-Path -Parent $PSScriptRoot) $dir))) { $problems += "Diretorio ausente: $dir" }
}
if ($problems.Count) {
    $problems | ForEach-Object { Write-Error $_ }
    exit 1
}
Write-Host 'Preflight de publicacao aprovado.' -ForegroundColor Green
