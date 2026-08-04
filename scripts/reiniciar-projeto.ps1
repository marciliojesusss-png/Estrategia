<#
.SYNOPSIS
  Reinicia o servidor local da aplicação.

.DESCRIPTION
  Finaliza qualquer servidor PHP embutido da aplicação encontrado na porta
  informada e inicia uma nova execução em segundo plano. A finalização usa o
  mesmo critério de finalizar-projeto.ps1, incluindo execuções iniciadas em
  primeiro plano por outro terminal.

.PARAMETER BindHost
  Endereço de bind (padrão: 127.0.0.1).

.PARAMETER Port
  Porta (padrão: 8000).

.PARAMETER BasePath
  Valor de APP_BASE_PATH para a nova execução.

.PARAMETER DryRun
  Exibe as ações que seriam executadas sem finalizar nem iniciar o servidor.
#>

param(
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 8000,
  [string]$BasePath = '',
  [switch]$DryRun = $false
)

$ErrorActionPreference = 'Stop'

if ($Port -lt 1 -or $Port -gt 65535) {
  throw "Porta invalida: $Port. Informe um valor entre 1 e 65535."
}

$root = Split-Path -Parent $PSScriptRoot
$stopScript = Join-Path $PSScriptRoot 'finalizar-projeto.ps1'
$startScript = Join-Path $PSScriptRoot 'executar-projeto.ps1'

if (!(Test-Path $stopScript) -or !(Test-Path $startScript)) {
  throw 'Scripts de finalizacao ou inicializacao nao encontrados.'
}

Set-Location $root

$normalizedBasePath = '/' + $BasePath.Trim('/')
if ($normalizedBasePath -eq '/') {
  $normalizedBasePath = ''
}
$applicationUrlPath = if ($normalizedBasePath -eq '') { '/' } else { $normalizedBasePath + '/' }

Write-Host "Reiniciando servidor local da aplicação em $BindHost`:$Port" -ForegroundColor Cyan

if ($DryRun) {
  Write-Host 'DryRun ativado - nenhuma alteração será realizada.' -ForegroundColor Yellow
  Write-Host "Finalizaria: powershell -ExecutionPolicy Bypass -File .\scripts\finalizar-projeto.ps1 -Port $Port" -ForegroundColor Gray
  Write-Host "Iniciaria: powershell -ExecutionPolicy Bypass -File .\scripts\executar-projeto.ps1 -BindHost $BindHost -Port $Port -BasePath '$BasePath' -Background" -ForegroundColor Gray
  return
}

Write-Host '1/2 - Finalizando a execução atual...' -ForegroundColor Yellow
& $stopScript -Port $Port

Write-Host '2/2 - Iniciando uma nova execução em segundo plano...' -ForegroundColor Yellow
& $startScript -BindHost $BindHost -Port $Port -BasePath $BasePath -Background

Write-Host "Restart concluído. Acesse http://$BindHost`:$Port$applicationUrlPath" -ForegroundColor Green