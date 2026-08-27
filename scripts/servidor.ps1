<#
.SYNOPSIS
  Executa, finaliza ou reinicia o servidor local da aplicacao.

.DESCRIPTION
  Este e o unico script operacional da pasta scripts. O servidor PHP embutido
  usa public/router.php e pode ser executado em primeiro ou segundo plano.

.PARAMETER Acao
  Acao: executar, finalizar ou reiniciar. Tambem aceita start, stop e restart.

.PARAMETER BindHost
  Endereco de bind (padrao: 127.0.0.1).

.PARAMETER Port
  Porta (padrao: 8000).

.PARAMETER BasePath
  Valor de APP_BASE_PATH (padrao: '/estrategia'). Use '/' para executar na raiz.

.PARAMETER Background
  Executa o servidor em segundo plano. A acao reiniciar sempre inicia em
  segundo plano.

.PARAMETER DryRun
  Exibe a acao sem iniciar ou finalizar processos.
#>

[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('executar', 'finalizar', 'reiniciar', 'start', 'stop', 'restart')]
  [string]$Acao = 'executar',
  [string]$BindHost = '127.0.0.1',
  [int]$Port = 8000,
  [string]$BasePath = '/estrategia',
  [switch]$Background = $false,
  [switch]$DryRun = $false,
  [switch]$OpenBrowser = $false
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($Port -lt 1 -or $Port -gt 65535) {
  throw "Porta invalida: $Port. Informe um valor entre 1 e 65535."
}
if ($BindHost -match '[^A-Za-z0-9.\-:\[\]]') {
  throw "Endereco de bind invalido: $BindHost."
}
if ($BasePath -match '"') {
  throw 'BasePath invalido: aspas duplas nao sao permitidas.'
}

$actionMap = @{
  start = 'executar'
  stop = 'finalizar'
  restart = 'reiniciar'
}
if ($actionMap.ContainsKey($Acao)) {
  $Acao = $actionMap[$Acao]
}

$publicPath = Join-Path $root 'public'
$routerPath = Join-Path $publicPath 'router.php'
$publicArgument = 'public'
$routerArgument = 'public/router.php'
$runtimePath = Join-Path $root 'storage\temporarios'
$logPath = Join-Path $root 'storage\logs'
$pidFile = Join-Path $runtimePath ("php-server-{0}.pid" -f $Port)
$routerPattern = [regex]::Escape($routerPath)
$routerRelativePattern = '(?i)(^|\s|")public[\\/]+router\.php("|\s|$)'
$publicPathPattern = [regex]::Escape($publicPath)
$publicRelativePattern = '(?i)(^|\s|")public("|\s|$)'
$portPattern = '(?i)(^|\s)-S\s+\S*:' + $Port + '(\s|$)'

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

function Test-ApplicationCommandLine {
  param([string]$CommandLine)

  if ([string]::IsNullOrWhiteSpace($CommandLine)) {
    return $false
  }
  if ($CommandLine -notmatch $portPattern) {
    return $false
  }

  return $CommandLine -match $routerPattern -or
    $CommandLine -match $routerRelativePattern -or
    $CommandLine -match $publicPathPattern -or
    $CommandLine -match $publicRelativePattern
}

function Get-ListeningProcessIdsByPort {
  $ids = New-Object System.Collections.Generic.HashSet[int]

  try {
    if ($null -ne (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)) {
      Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | ForEach-Object {
        if ($_.OwningProcess -gt 0) {
          [void]$ids.Add([int]$_.OwningProcess)
        }
      }
    }
  } catch {
    # Algumas instalacoes bloqueiam Get-NetTCPConnection. O netstat cobre esse caso.
  }

  if ($ids.Count -eq 0) {
    try {
      $portSuffix = ':' + $Port
      & netstat.exe -ano -p tcp | ForEach-Object {
        $line = [string]$_
        if ($line -match '^\s*TCP\s+\S+' -and $line -match [regex]::Escape($portSuffix) -and $line -match '\s+LISTENING\s+(\d+)\s*$') {
          [void]$ids.Add([int]$Matches[1])
        }
      }
    } catch {
      # Sem fallback de porta, a busca por linha de comando ainda sera usada.
    }
  }

  return ($ids | ForEach-Object { [int]$_ })
}

function Get-ApplicationProcessIds {
  $processIds = New-Object System.Collections.Generic.HashSet[int]

  if (Test-Path $pidFile) {
    $registeredPid = 0
    [int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$registeredPid) | Out-Null
    if ($registeredPid -gt 0) {
      $registeredProcess = Get-Process -Id $registeredPid -ErrorAction SilentlyContinue
      $registeredDetails = Get-CimInstance Win32_Process -Filter "ProcessId = $registeredPid" -ErrorAction SilentlyContinue
      $isManagedProcess = $null -ne $registeredProcess -and
        (($registeredProcess.ProcessName -like 'php*') -or ($registeredProcess.ProcessName -like 'cmd*'))
      if ($null -ne $registeredProcess -and
          $isManagedProcess -and
          (($null -ne $registeredDetails -and (Test-ApplicationCommandLine $registeredDetails.CommandLine)) -or
           ($null -eq $registeredDetails))) {
        [void]$processIds.Add($registeredPid)
      }
    }
  }

  try {
    Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object {
      (($_.Name -like 'php*.exe') -or ($_.Name -like 'cmd*.exe')) -and
      (Test-ApplicationCommandLine $_.CommandLine)
    } | ForEach-Object {
      [void]$processIds.Add([int]$_.ProcessId)
    }
  } catch {
    Write-Host "Aviso: nao foi possivel enumerar processos via CIM. Usando apenas o PID registrado." -ForegroundColor Yellow
  }

  foreach ($portProcessId in (Get-ListeningProcessIdsByPort)) {
    $portProcess = Get-Process -Id $portProcessId -ErrorAction SilentlyContinue
    if ($null -ne $portProcess -and $portProcess.ProcessName -like 'php*') {
      [void]$processIds.Add([int]$portProcessId)
    }
  }

  return ($processIds | ForEach-Object { [int]$_ })
}

function Stop-ApplicationServer {
  $processIds = @(Get-ApplicationProcessIds)
  if ($processIds.Count -eq 0) {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "Nenhum servidor local encontrado na porta $Port." -ForegroundColor Yellow
    return
  }

  foreach ($processId in $processIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -eq $process) { continue }

    Write-Host "Finalizando servidor PHP (PID $processId) na porta $Port..." -ForegroundColor Cyan
    if ($process.ProcessName -like 'cmd*') {
      & taskkill.exe /PID $processId /T /F | Out-Null
    } else {
      Stop-Process -Id $processId -ErrorAction Stop
    }
    try {
      Wait-Process -Id $processId -Timeout 5 -ErrorAction SilentlyContinue
    } catch {
      # O processo pode ter sido encerrado antes da espera terminar.
    }
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  Write-Host 'Servidor finalizado.' -ForegroundColor Green
}

function Start-ApplicationServer {
  $phpPath = Resolve-PhpExecutable
  $address = "${BindHost}:$Port"

  if (-not (Test-Path $publicPath -PathType Container)) {
    throw "Pasta public nao encontrada em: $publicPath"
  }
  if (-not (Test-Path $routerPath -PathType Leaf)) {
    throw "Router local nao encontrado em: $routerPath"
  }

  New-Item -ItemType Directory -Force -Path $runtimePath, $logPath | Out-Null
  Write-Host "Executavel PHP: $phpPath" -ForegroundColor Green
  Write-Host "Executando em: $root" -ForegroundColor Green
  Write-Host "Executando: $phpPath -S $address -t $publicArgument $routerArgument" -ForegroundColor Cyan

  if ($Background) {
    $activeProcessIds = @(Get-ApplicationProcessIds)
    if ($activeProcessIds.Count -gt 0) {
      throw "Ja existe um servidor local na porta $Port (PID $($activeProcessIds -join ', ')). Use .\scripts\servidor.ps1 finalizar -Port $Port."
    }

    if (Test-Path $pidFile) {
      Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }

    $stdoutFile = Join-Path $logPath ("php-server-{0}.out.log" -f $Port)
    $stderrFile = Join-Path $logPath ("php-server-{0}.err.log" -f $Port)
    $safeBasePath = $BasePath.Replace('"', '')
    $environmentBasePath = '/' + $safeBasePath.Trim('/')
    if ($environmentBasePath -eq '/') {
      # O CMD remove a variavel quando recebe valor vazio. A barra impede que
      # a configuracao normalize APP_BASE_PATH para raiz sem depender de valor vazio.
      $environmentBasePath = '/'
    }
    $oldAppEnv = $env:APP_ENV
    $oldAppBasePath = $env:APP_BASE_PATH
    try {
      $env:APP_ENV = 'development'
      # Nao sobrescreve DB_CONNECTION: a configuracao local decide entre sqlsrv e sqlite.
      $env:APP_BASE_PATH = $environmentBasePath
      $process = Start-Process -FilePath $phpPath `
        -ArgumentList @('-S', $address, '-t', $publicArgument, $routerArgument) `
        -WorkingDirectory $root `
        -RedirectStandardOutput $stdoutFile `
        -RedirectStandardError $stderrFile `
        -WindowStyle Hidden `
        -PassThru
    } finally {
      if ($null -eq $oldAppEnv) { Remove-Item Env:APP_ENV -ErrorAction SilentlyContinue } else { $env:APP_ENV = $oldAppEnv }
      if ($null -eq $oldAppBasePath) { Remove-Item Env:APP_BASE_PATH -ErrorAction SilentlyContinue } else { $env:APP_BASE_PATH = $oldAppBasePath }
    }

    Set-Content -Path $pidFile -Value $process.Id -Encoding ASCII
    Write-Host "Servidor iniciado em segundo plano. PID: $($process.Id)" -ForegroundColor Green
    Write-Host "Logs: $stdoutFile e $stderrFile" -ForegroundColor Gray
    return
  }

  & $phpPath -S $address -t $publicArgument $routerArgument
  Write-Host 'Servidor finalizado.' -ForegroundColor Cyan
}

function Get-ApplicationUrl {
  param([string]$Route = 'login')

  $normalizedBasePath = '/' + $BasePath.Trim('/')
  if ($normalizedBasePath -eq '/') { $normalizedBasePath = '' }
  return "http://$BindHost`:$Port$normalizedBasePath/index.php?route=$Route"
}

function Wait-ApplicationReady {
  param([string]$Url)

  for ($attempt = 1; $attempt -le 10; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      $content = [string]$response.Content
      $contentType = [string]$response.Headers['Content-Type']
      if ($contentType -match 'application/octet-stream') {
        Write-Host 'Atencao: a URL respondeu application/octet-stream. O PHP nao foi interpretado; verifique public/router.php ou FastCGI.' -ForegroundColor Red
        return $false
      }
      if ($content.TrimStart().StartsWith('<?php')) {
        Write-Host 'Atencao: o servidor respondeu o codigo PHP cru. Use o servidor PHP embutido ou configure FastCGI no IIS.' -ForegroundColor Red
        return $false
      }
      Write-Host "Aplicacao respondeu HTTP $($response.StatusCode). Content-Type: $contentType" -ForegroundColor Green
      return $true
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  Write-Host "Nao foi possivel confirmar a aplicacao em $Url. Consulte os logs em storage\logs." -ForegroundColor Yellow
  return $false
}

function Open-ApplicationBrowser {
  param([string]$Url)

  Write-Host "Abrindo navegador em $Url" -ForegroundColor Cyan
  Start-Process $Url
}

function Show-DryRun {
  switch ($Acao) {
    'executar' {
      $backgroundText = if ($Background) { ' -Background' } else { '' }
      $browserText = if ($OpenBrowser) { ' -OpenBrowser' } else { '' }
      Write-Host "Executaria: .\scripts\servidor.ps1 executar -BindHost $BindHost -Port $Port -BasePath '$BasePath'$backgroundText$browserText" -ForegroundColor Gray
    }
    'finalizar' {
      Write-Host "Finalizaria o servidor PHP da aplicacao na porta $Port." -ForegroundColor Gray
    }
    'reiniciar' {
      Write-Host "Finalizaria e iniciaria em segundo plano na porta $Port com BasePath '$BasePath'." -ForegroundColor Gray
    }
  }
}

if ($DryRun) {
  Show-DryRun
  return
}

Write-Host "Acao: $Acao | Host: $BindHost | Porta: $Port | APP_BASE_PATH: '$BasePath'" -ForegroundColor Yellow

switch ($Acao) {
  'executar' {
    $env:APP_ENV = 'development'
    # O driver do banco nao e forcado aqui. app/config/servidor.local.php pode
    # selecionar sqlsrv; sem configuracao explicita, config.php usa SQLite no desenvolvimento.
    $env:APP_BASE_PATH = $BasePath
    $applicationUrl = Get-ApplicationUrl 'login'
    Write-Host "URL local: $applicationUrl" -ForegroundColor Green
    if ($Background) {
      Start-ApplicationServer
      Wait-ApplicationReady $applicationUrl | Out-Null
      if ($OpenBrowser) { Open-ApplicationBrowser $applicationUrl }
    } else {
      Write-Host 'Abra essa URL no navegador. Nao abra public/index.php diretamente pelo Explorador.' -ForegroundColor Yellow
      Start-ApplicationServer
    }
  }
  'finalizar' {
    Stop-ApplicationServer
  }
  'reiniciar' {
    Stop-ApplicationServer
    $Background = $true
    $env:APP_ENV = 'development'
    # Mantem a mesma regra da acao executar: servidor.local.php pode selecionar sqlsrv.
    $env:APP_BASE_PATH = $BasePath
    Start-ApplicationServer
    $applicationUrl = Get-ApplicationUrl 'login'
    Wait-ApplicationReady $applicationUrl | Out-Null
    Write-Host "Restart concluido. Acesse $applicationUrl" -ForegroundColor Green
    if ($OpenBrowser) { Open-ApplicationBrowser $applicationUrl }
  }
}