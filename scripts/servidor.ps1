<#
.SYNOPSIS
  Executa, finaliza ou reinicia o servidor local da aplicação.

.DESCRIPTION
  Este é o único script operacional da pasta scripts. O servidor PHP embutido
  usa public/router.php e pode ser executado em primeiro ou segundo plano.

.PARAMETER Acao
  Ação: executar, finalizar ou reiniciar. Também aceita start, stop e restart.

.PARAMETER BindHost
  Endereço de bind (padrão: 127.0.0.1).

.PARAMETER Port
  Porta (padrão: 8000).

.PARAMETER BasePath
  Valor de APP_BASE_PATH (padrão: '/estrategia'). Use '/' para executar na raiz.

.PARAMETER Background
  Executa o servidor em segundo plano. A ação reiniciar sempre inicia em
  segundo plano.

.PARAMETER DryRun
  Exibe a ação sem iniciar ou finalizar processos.
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
  [switch]$DryRun = $false
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
$runtimePath = Join-Path $root 'storage\temporarios'
$logPath = Join-Path $root 'storage\logs'
$pidFile = Join-Path $runtimePath ("php-server-{0}.pid" -f $Port)
$routerPattern = [regex]::Escape($routerPath)
$portPattern = '(?i)(^|\s)-S\s+\S*:' + $Port + '(\s|$)'

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
          $null -ne $registeredDetails -and
          $registeredDetails.CommandLine -match $portPattern -and
          $registeredDetails.CommandLine -match $routerPattern) {
        [void]$processIds.Add($registeredPid)
      }
    }
  }

  Get-CimInstance Win32_Process | Where-Object {
    (($_.Name -like 'php*.exe') -or ($_.Name -like 'cmd*.exe')) -and
    $_.CommandLine -match $portPattern -and
    $_.CommandLine -match $routerPattern
  } | ForEach-Object {
    [void]$processIds.Add([int]$_.ProcessId)
  }

  return ($processIds | ForEach-Object { [int]$_ })
}

function Stop-ApplicationServer {
  $processIds = Get-ApplicationProcessIds
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
  $php = Get-Command php -ErrorAction Stop
  $phpPath = $php.Source
  $address = "${BindHost}:$Port"

  New-Item -ItemType Directory -Force -Path $runtimePath, $logPath | Out-Null
  Write-Host "Executável PHP: $phpPath" -ForegroundColor Green
  Write-Host "Executando: php -S $address -t public public/router.php" -ForegroundColor Cyan

  if ($Background) {
    if (Test-Path $pidFile) {
      $oldPid = 0
      [int]::TryParse((Get-Content $pidFile -Raw).Trim(), [ref]$oldPid) | Out-Null
      if ($oldPid -gt 0 -and (Get-Process -Id $oldPid -ErrorAction SilentlyContinue)) {
        throw "Ja existe um servidor registrado na porta $Port (PID $oldPid). Use .\scripts\servidor.ps1 finalizar."
      }
      Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }

    $stdoutFile = Join-Path $logPath ("php-server-{0}.out.log" -f $Port)
    $stderrFile = Join-Path $logPath ("php-server-{0}.err.log" -f $Port)
    $safeBasePath = $BasePath.Replace('"', '')
    $environmentBasePath = '/' + $safeBasePath.Trim('/')
    if ($environmentBasePath -eq '/') {
      # O CMD remove a variável quando recebe valor vazio. A barra impede que
      # a configuração normalize APP_BASE_PATH para raiz sem depender de valor vazio.
      $environmentBasePath = '/'
    }
    $commandLine = 'set "APP_ENV=development" && set "DB_CONNECTION=sqlite" && set "APP_BASE_PATH=' + $environmentBasePath + '" && "' + $phpPath + '" -S ' + $address + ' -t "' + $publicPath + '" "' + $routerPath + '"'
    $process = Start-Process -FilePath $env:ComSpec `
      -ArgumentList @('/d', '/c', $commandLine) `
      -WorkingDirectory $root `
      -RedirectStandardOutput $stdoutFile `
      -RedirectStandardError $stderrFile `
      -PassThru

    Set-Content -Path $pidFile -Value $process.Id -Encoding ASCII
    Write-Host "Servidor iniciado em segundo plano. PID: $($process.Id)" -ForegroundColor Green
    Write-Host "Logs: $stdoutFile e $stderrFile" -ForegroundColor Gray
    return
  }

  & $phpPath -S $address -t $publicPath $routerPath
  Write-Host 'Servidor finalizado.' -ForegroundColor Cyan
}

function Show-DryRun {
  switch ($Acao) {
    'executar' {
      $backgroundText = if ($Background) { ' -Background' } else { '' }
      Write-Host "Executaria: .\scripts\servidor.ps1 executar -BindHost $BindHost -Port $Port -BasePath '$BasePath'$backgroundText" -ForegroundColor Gray
    }
    'finalizar' {
      Write-Host "Finalizaria o servidor PHP da aplicação na porta $Port." -ForegroundColor Gray
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

Write-Host "Ação: $Acao | Host: $BindHost | Porta: $Port | APP_BASE_PATH: '$BasePath'" -ForegroundColor Yellow

switch ($Acao) {
  'executar' {
    $env:APP_ENV = 'development'
    $env:DB_CONNECTION = 'sqlite'
    $env:APP_BASE_PATH = $BasePath
    Start-ApplicationServer
  }
  'finalizar' {
    Stop-ApplicationServer
  }
  'reiniciar' {
    Stop-ApplicationServer
    $Background = $true
    $env:APP_ENV = 'development'
    $env:DB_CONNECTION = 'sqlite'
    $env:APP_BASE_PATH = $BasePath
    Start-ApplicationServer
    $normalizedBasePath = '/' + $BasePath.Trim('/')
    if ($normalizedBasePath -eq '/') { $normalizedBasePath = '' }
    $applicationUrlPath = if ($normalizedBasePath -eq '') { '/' } else { $normalizedBasePath + '/' }
    Write-Host "Restart concluído. Acesse http://$BindHost`:$Port$applicationUrlPath" -ForegroundColor Green
  }
}
