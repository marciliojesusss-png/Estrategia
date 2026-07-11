<#
.SYNOPSIS
  Starta a aplicação localmente com variáveis de ambiente adequadas.

.PARAMETER Host
  Endereço de bind (padrão: 127.0.0.1)

.PARAMETER Port
  Porta (padrão: 8000)

.PARAMETER BasePath
  Valor de APP_BASE_PATH. Use '' para raiz (padrão em desenvolvimento).
  Para simular publicação em /estrategia, passe '/estrategia'.

EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\start-app.ps1
  powershell -ExecutionPolicy Bypass -File .\scripts\start-app.ps1 -Host 0.0.0.0 -Port 8080 -BasePath '/estrategia'
#>

param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 8000,
  [string]$BasePath = '',
  [switch]$DryRun = $false
)

Write-Host "Starting application local server" -ForegroundColor Cyan
Write-Host "Host: $BindHost    Port: $Port    APP_BASE_PATH: '$BasePath'" -ForegroundColor Yellow

# Export environment variables for the current process
$env:APP_ENV = 'development'
$env:DB_CONNECTION = 'sqlite'
$env:APP_BASE_PATH = $BasePath

# Informações de diagnóstico rápido
Write-Host "PHP executable: $(Get-Command php -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)" -ForegroundColor Green
Write-Host "PHP Version: $(php -v | Select-Object -First 1)" -ForegroundColor Green

# Inicia o servidor embutido do PHP usando o front controller

$address = "$BindHost`:$Port"
Write-Host "Executando: php -S $address -t public public/router.php" -ForegroundColor Cyan

if ($DryRun) {
  Write-Host "DryRun ativado — não iniciando o servidor." -ForegroundColor Yellow
  Write-Host "Comando que seria executado: php -S $address -t public public/router.php" -ForegroundColor Gray
  return 0
}

# Executa em foreground para que o usuário veja logs
& php -S $address -t public public/router.php

Write-Host "Servidor finalizado." -ForegroundColor Cyan