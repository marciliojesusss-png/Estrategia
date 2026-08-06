<#
.SYNOPSIS
  Coleta informacoes gerais do servidor para suporte e publicacao.

.DESCRIPTION
  Script somente leitura. Nao altera IIS, PHP, Windows, permissoes, banco de
  dados, arquivos de configuracao ou variaveis de ambiente.
#>

[CmdletBinding()]
param(
  [string]$OutputPath = '',
  [switch]$IncludeEnvironment = $false
)

$ErrorActionPreference = 'Continue'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Split-Path -Parent $ScriptRoot
$LogRoot = Join-Path $AppRoot 'storage\logs'

if (-not (Test-Path $LogRoot -PathType Container)) {
  New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $LogRoot ("informacoes-servidor-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd-HHmmss'))
}

$Lines = New-Object System.Collections.Generic.List[string]

function Add-Line {
  param([string]$Text = '')
  [void]$Lines.Add($Text)
}

function Sanitize-Text {
  param([object]$Value)
  $text = [string]$Value
  if ([string]::IsNullOrEmpty($text)) { return '' }
  $text = $text -replace "(`r|`n)+", ' '
  $text = $text -replace '(?i)(password|senha|pwd|token|secret|chave|key|credential|credencial)\s*=\s*[^;&\s]+', '$1=[PROTEGIDO]'
  $text = $text -replace '(?i)(password|senha|pwd|token|secret|chave|key|credential|credencial)["'']?\s*[:=]\s*["'']?[^,"'';\s]+', '$1=[PROTEGIDO]'
  return $text
}

function Add-Item {
  param([string]$Status, [string]$Section, [string]$Label, [string]$Detail = '')
  $line = "[{0}] {1} - {2}" -f $Status, $Section, $Label
  $safeDetail = Sanitize-Text $Detail
  if (-not [string]::IsNullOrWhiteSpace($safeDetail)) {
    $line += ": $safeDetail"
  }
  Add-Line $line
}

function Get-CommandPath {
  param([string]$Name)
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($null -eq $command) { return '' }
  return [string]$command.Source
}

function Invoke-ExternalVersion {
  param([string]$Exe, [string[]]$Arguments)
  if ([string]::IsNullOrWhiteSpace($Exe) -or -not (Test-Path $Exe -PathType Leaf)) {
    return ''
  }
  try {
    $output = & $Exe @Arguments 2>&1
    return (($output | Select-Object -First 5) -join ' | ')
  } catch {
    return $_.Exception.Message
  }
}

function Get-PhpCandidates {
  $paths = New-Object System.Collections.Generic.List[string]
  $php = Get-Command php -ErrorAction SilentlyContinue
  if ($null -ne $php) { [void]$paths.Add($php.Source) }

  $patterns = @(
    'C:\php\php.exe',
    'C:\php\php-cgi.exe',
    'C:\Sistemas\toolsphp*\php*\php.exe',
    'C:\Sistemas\toolsphp*\php*\php-cgi.exe',
    'C:\Sistemas\php*\php.exe',
    'C:\Sistemas\php*\php-cgi.exe',
    'C:\tools\php*\php.exe',
    'C:\tools\php*\php-cgi.exe',
    'C:\Program Files\PHP\*\php.exe',
    'C:\Program Files\PHP\*\php-cgi.exe',
    'C:\Program Files (x86)\PHP\*\php.exe',
    'C:\Program Files (x86)\PHP\*\php-cgi.exe'
  )
  foreach ($pattern in $patterns) {
    Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | ForEach-Object {
      [void]$paths.Add($_.FullName)
    }
  }
  return @($paths | Select-Object -Unique | Sort-Object)
}

function Get-AppCmdPath {
  $path = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
  if (Test-Path $path -PathType Leaf) { return $path }
  return ''
}

function Test-PathAccess {
  param([string]$Path, [string]$Label)
  if ([string]::IsNullOrWhiteSpace($Path)) {
    Add-Item 'AVISO' 'PROJETO' $Label 'caminho vazio'
    return
  }
  if (Test-Path $Path) {
    Add-Item 'OK' 'PROJETO' $Label $Path
  } else {
    Add-Item 'FALHA' 'PROJETO' $Label ("nao encontrado: {0}" -f $Path)
  }
}

Add-Line 'INFORMACOES DO SERVIDOR - Estrategia'
Add-Line ("Gerado em: {0:yyyy-MM-dd HH:mm:ss}" -f (Get-Date))
Add-Line ("Raiz do projeto: {0}" -f $AppRoot)
Add-Line 'Este script e somente leitura.'
Add-Line ''

try {
  $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
  Add-Item 'OK' 'SISTEMA' 'computador' $env:COMPUTERNAME
  Add-Item 'OK' 'SISTEMA' 'Windows' ("{0} {1} build {2}" -f $os.Caption, $os.OSArchitecture, $os.BuildNumber)
  Add-Item 'OK' 'SISTEMA' 'instalado em' ([Management.ManagementDateTimeConverter]::ToDateTime($os.InstallDate).ToString('yyyy-MM-dd HH:mm:ss'))
  Add-Item 'OK' 'SISTEMA' 'ultimo boot' ([Management.ManagementDateTimeConverter]::ToDateTime($os.LastBootUpTime).ToString('yyyy-MM-dd HH:mm:ss'))
} catch {
  Add-Item 'AVISO' 'SISTEMA' 'Windows' $_.Exception.Message
}

try {
  $computer = Get-CimInstance Win32_ComputerSystem -ErrorAction Stop
  Add-Item 'OK' 'SISTEMA' 'dominio/workgroup' $computer.Domain
  Add-Item 'OK' 'SISTEMA' 'memoria fisica total MB' ([string]([Math]::Round($computer.TotalPhysicalMemory / 1MB, 0)))
} catch {
  Add-Item 'AVISO' 'SISTEMA' 'computador' $_.Exception.Message
}

Add-Item 'OK' 'SISTEMA' 'usuario atual' ([Security.Principal.WindowsIdentity]::GetCurrent().Name)
Add-Item 'OK' 'SISTEMA' 'PowerShell' $PSVersionTable.PSVersion.ToString()
Add-Item 'OK' 'SISTEMA' 'timezone' ([TimeZoneInfo]::Local.Id)
Add-Item 'OK' 'SISTEMA' 'cultura' ([Globalization.CultureInfo]::CurrentCulture.Name)

try {
  Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" -ErrorAction Stop | ForEach-Object {
    Add-Item 'OK' 'DISCO' $_.DeviceID ("livre={0} GB; total={1} GB" -f ([Math]::Round($_.FreeSpace / 1GB, 2)), ([Math]::Round($_.Size / 1GB, 2)))
  }
} catch {
  Add-Item 'AVISO' 'DISCO' 'unidades locais' $_.Exception.Message
}

Add-Line ''
Add-Line 'IIS'
Add-Line ('-' * 80)
$webAdmin = Get-Module -ListAvailable -Name WebAdministration
Add-Item ($(if ($webAdmin) { 'OK' } else { 'AVISO' })) 'IIS' 'modulo WebAdministration' ($(if ($webAdmin) { 'disponivel' } else { 'nao encontrado' }))
$appcmd = Get-AppCmdPath
Add-Item ($(if ($appcmd) { 'OK' } else { 'AVISO' })) 'IIS' 'appcmd.exe' ($(if ($appcmd) { $appcmd } else { 'nao encontrado' }))
foreach ($serviceName in @('W3SVC', 'WAS')) {
  try {
    $service = Get-Service -Name $serviceName -ErrorAction Stop
    Add-Item 'OK' 'IIS' ("servico {0}" -f $serviceName) ("status={0}; startType={1}" -f $service.Status, $service.StartType)
  } catch {
    Add-Item 'AVISO' 'IIS' ("servico {0}" -f $serviceName) $_.Exception.Message
  }
}

Add-Line ''
Add-Line 'PHP'
Add-Line ('-' * 80)
$phpCandidates = Get-PhpCandidates
if ($phpCandidates.Count -eq 0) {
  Add-Item 'FALHA' 'PHP' 'executaveis encontrados' 'nenhum php.exe/php-cgi.exe encontrado nos caminhos comuns'
} else {
  foreach ($candidate in $phpCandidates) {
    Add-Item 'OK' 'PHP' 'executavel encontrado' $candidate
    Add-Item 'OK' 'PHP' 'versao' (Invoke-ExternalVersion -Exe $candidate -Arguments @('-v'))
    if ((Split-Path -Leaf $candidate) -ieq 'php.exe') {
      Add-Item 'OK' 'PHP' 'php.ini' (Invoke-ExternalVersion -Exe $candidate -Arguments @('--ini'))
    }
  }
}

Add-Line ''
Add-Line 'ODBC / SQL SERVER'
Add-Line ('-' * 80)
try {
  $drivers = Get-OdbcDriver -ErrorAction Stop | Where-Object { $_.Name -match 'SQL Server|ODBC Driver' }
  if ($drivers) {
    foreach ($driver in $drivers) {
      Add-Item 'OK' 'ODBC' 'driver' ("{0}; platform={1}" -f $driver.Name, $driver.Platform)
    }
  } else {
    Add-Item 'AVISO' 'ODBC' 'drivers SQL Server' 'nenhum driver ODBC SQL Server encontrado'
  }
} catch {
  Add-Item 'AVISO' 'ODBC' 'drivers SQL Server' $_.Exception.Message
}

$sqlcmd = Get-CommandPath 'sqlcmd'
Add-Item ($(if ($sqlcmd) { 'OK' } else { 'AVISO' })) 'ODBC' 'sqlcmd' ($(if ($sqlcmd) { $sqlcmd } else { 'nao encontrado' }))

Add-Line ''
Add-Line 'PROJETO'
Add-Line ('-' * 80)
Test-PathAccess -Path $AppRoot -Label 'raiz'
Test-PathAccess -Path (Join-Path $AppRoot 'public') -Label 'public'
Test-PathAccess -Path (Join-Path $AppRoot 'app\config\config.php') -Label 'config.php'
Test-PathAccess -Path (Join-Path $AppRoot 'app\config\servidor.local.php') -Label 'servidor.local.php'
Test-PathAccess -Path (Join-Path $AppRoot 'storage\logs') -Label 'storage/logs'
Test-PathAccess -Path (Join-Path $AppRoot 'storage\temporarios') -Label 'storage/temporarios'
Test-PathAccess -Path (Join-Path $AppRoot 'uploads\evidencias') -Label 'uploads/evidencias'

if ($IncludeEnvironment) {
  Add-Line ''
  Add-Line 'VARIAVEIS DE AMBIENTE SANITIZADAS'
  Add-Line ('-' * 80)
  Get-ChildItem Env: | Sort-Object Name | ForEach-Object {
    Add-Item 'OK' 'ENV' $_.Name $_.Value
  }
}

Add-Line ''
Add-Line ("RELATORIO GERADO: {0}" -f $OutputPath)

$Lines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Output ($Lines -join [Environment]::NewLine)
Write-Output ''
Write-Output "RELATORIO GERADO: $OutputPath"
