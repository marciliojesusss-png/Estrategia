param([switch]$SemPython)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Invoke-Step([string]$Name, [scriptblock]$Command) {
    Write-Host "`n== $Name ==" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) { throw "$Name falhou (codigo $LASTEXITCODE)." }
}

$php = Get-Command php -ErrorAction Stop
$node = Get-Command node -ErrorAction Stop
Write-Host "PHP: $(& $php.Source -v | Select-Object -First 1)"
Write-Host "Node: $(& $node.Source -v)"

Invoke-Step 'Sintaxe PHP' {
    Get-ChildItem app,api,public,tests -Recurse -Filter *.php | ForEach-Object {
        & php -l $_.FullName | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Sintaxe invalida: $($_.FullName)" }
    }
}

Get-ChildItem tests -Filter *.test.php | Sort-Object Name | ForEach-Object {
    Invoke-Step $_.Name { & php $_.FullName }
}
Get-ChildItem tests -Filter *.test.js | Sort-Object Name | ForEach-Object {
    Invoke-Step $_.Name { & node $_.FullName }
}

if (!$SemPython) {
    Invoke-Step 'Sintaxe da migracao SQL Server' { & python -m py_compile scripts\migrar-para-sqlserver.py }
}

Write-Host "`nSUCESSO: regressao local concluida." -ForegroundColor Green
