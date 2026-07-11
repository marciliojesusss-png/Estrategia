<#
.SYNOPSIS
  Executa a aplicação localmente.

.DESCRIPTION
  Inicia o servidor PHP embutido usando o router da aplicação. Por padrão,
  mantém o servidor em primeiro plano. Use -Background para iniciar em
  segundo plano e permitir a finalização por finalizar-projeto.ps1.

.PARAMETER BindHost
  Endereço de bind (padrão: 127.0.0.1).

.PARAMETER Port
  Porta (padrão: 8000).

.PARAMETER BasePath
  Valor de APP_BASE_PATH. Use '/estrategia' para simular a publicação.

.PARAMETER Background
  Inicia o servidor em segundo plano e grava o PID para finalização.
#>

param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 8000,
  [string]$BasePath = '',
  [switch]$Background = $false,
  [switch]$DryRun = $false
)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Port -lt 1 -or $Port -gt 65535) {
  throw "Porta invalida: $Port. Informe um valor entre 1 e 65535."
}

$php = Get-Command php -ErrorAction Stop
$phpPath = $php.Source

Write-Host "Iniciando servidor local da aplicação" -ForegroundColor Cyan
Write-Host "Host: $BindHost    Porta: $Port    APP_BASE_PATH: '$BasePath'    Segundo plano: $Background" -ForegroundColor Yellow

$env:APP_ENV = 'development'
$env:DB_CONNECTION = 'sqlite'
$env:APP_BASE_PATH = $BasePath

Write-Host "Executável PHP: $phpPath" -ForegroundColor Green
Write-Host "Versão PHP: $(& $phpPath -v | Select-Object -First 1)" -ForegroundColor Green

$address = "${BindHost}:$Port"
$publicPath = Join-Path $root 'public'
$routerPath = Join-Path $publicPath 'router.php'
Write-Host "Executando: php -S $address -t public public/router.php" -ForegroundColor Cyan

if ($DryRun) {
  Write-Host "DryRun ativado - servidor não iniciado." -ForegroundColor Yellow
  Write-Host "Comando que seria executado: php -S $address -t public public/router.php" -ForegroundColor Gray
  return
}

if ($Background) {
  $runtimePath = Join-Path $root 'storage\temporarios'
  $logPath = Join-Path $root 'storage\logs'
  New-Item -ItemType Directory -Force -Path $runtimePath, $logPath | Out-Null

  $pidFile = Join-Path $runtimePath ("php-server-{0}.pid" -f $Port)
  $stdoutFile = Join-Path $logPath ("php-server-{0}.out.log" -f $Port)
  $stderrFile = Join-Path $logPath ("php-server-{0}.err.log" -f $Port)

  if (Test-Path $pidFile) {
    $oldPid = 0
    [int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$oldPid) | Out-Null
    if ($oldPid -gt 0 -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
      throw "Ja existe um servidor registrado na porta $Port (PID $oldPid). Use finalizar-projeto.ps1 -Port $Port."
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  }

  $process = Start-Process -FilePath $phpPath `
    -ArgumentList @('-S', $address, '-t', $publicPath, $routerPath) `
    -WorkingDirectory $root `
    -RedirectStandardOutput $stdoutFile `
    -RedirectStandardError $stderrFile `
    -PassThru

  Set-Content -Path $pidFile -Value $process.Id -Encoding ASCII
  Write-Host "Servidor iniciado em segundo plano. PID: $($process.Id)" -ForegroundColor Green
  Write-Host "Logs: $stdoutFile e $stderrFile" -ForegroundColor Gray
  Write-Host "Para finalizar: powershell -ExecutionPolicy Bypass -File .\scripts\finalizar-projeto.ps1 -Port $Port" -ForegroundColor Yellow
  return
}

# Executa em foreground; Ctrl+C finaliza o servidor.
& $phpPath -S $address -t $publicPath $routerPath

Write-Host "Servidor finalizado." -ForegroundColor Cyan