<#
.SYNOPSIS
  Finaliza o servidor local da aplicação.

.DESCRIPTION
  Primeiro utiliza o PID registrado por executar-projeto.ps1 com -Background.
  Se não houver PID, procura servidores PHP embutidos que
  estejam usando a porta informada e public/router.php. Isso também permite
  finalizar uma execução iniciada em primeiro plano por outro terminal.
#>

param(
  [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

if ($Port -lt 1 -or $Port -gt 65535) {
  throw "Porta invalida: $Port. Informe um valor entre 1 e 65535."
}

$root = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $root ("storage\temporarios\php-server-{0}.pid" -f $Port)
$routerPattern = [regex]::Escape((Join-Path $root 'public\router.php'))
$portPattern = '(?i)(^|\s)-S\s+\S*:' + $Port + '(\s|$)'
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

# Também localiza a execução em foreground, que não possui arquivo de PID.
Get-CimInstance Win32_Process | Where-Object {
  (($_.Name -like 'php*.exe') -or ($_.Name -like 'cmd*.exe')) -and
  $_.CommandLine -match $portPattern -and
  $_.CommandLine -match $routerPattern
} | ForEach-Object {
  [void]$processIds.Add([int]$_.ProcessId)
}

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
Write-Host "Servidor finalizado." -ForegroundColor Green