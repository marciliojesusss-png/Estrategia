<#
.SYNOPSIS
  Le o php.ini usado por um executavel PHP.

.DESCRIPTION
  Script somente leitura. Localiza o php.exe, identifica o php.ini carregado,
  imprime o conteudo sanitizado e grava um relatorio em storage/logs.
#>

[CmdletBinding()]
param(
  [string]$PhpExe = '',
  [string]$IniPath = '',
  [switch]$IncludeScannedIni = $false,
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Stop'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Split-Path -Parent $ScriptRoot
$LogRoot = Join-Path $AppRoot 'storage\logs'

if (-not (Test-Path $LogRoot -PathType Container)) {
  New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $LogRoot ("php-ini-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd-HHmmss'))
}

function Resolve-PhpExecutable {
  param([string]$Requested)

  if (-not [string]::IsNullOrWhiteSpace($Requested)) {
    if (Test-Path $Requested -PathType Leaf) {
      return (Resolve-Path $Requested).Path
    }
    $command = Get-Command $Requested -ErrorAction SilentlyContinue
    if ($null -ne $command) {
      return $command.Source
    }
    throw "PHP nao encontrado: $Requested"
  }

  if ($env:PHP_EXE -and $env:PHP_EXE.Trim() -ne '') {
    return Resolve-PhpExecutable $env:PHP_EXE
  }

  $php = Get-Command php -ErrorAction SilentlyContinue
  if ($null -ne $php) {
    return $php.Source
  }

  $patterns = @(
    'C:\php\php.exe',
    'C:\Sistemas\toolsphp*\php*\php.exe',
    'C:\Sistemas\php*\php.exe',
    'C:\tools\php*\php.exe',
    'C:\Program Files\PHP\*\php.exe',
    'C:\Program Files (x86)\PHP\*\php.exe'
  )

  foreach ($pattern in $patterns) {
    $matches = @(Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending)
    if ($matches.Count -gt 0) {
      return $matches[0].FullName
    }
  }

  throw 'php.exe nao encontrado. Informe -PhpExe ou configure PHP_EXE.'
}

function Invoke-PhpInline {
  param([string]$Php, [string]$Code)
  try {
    $output = & $Php -r $Code 2>&1
    if ($LASTEXITCODE -ne 0) {
      return ''
    }
    return (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
  } catch {
    return ''
  }
}

function Sanitize-Content {
  param([string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return '' }
  $safeLines = New-Object System.Collections.Generic.List[string]
  foreach ($line in ($Text -split "`r?`n")) {
    if ($line -match '(?i)^\s*([^;#][^=]*(password|senha|pwd|token|secret|chave|key|credential|credencial)[^=]*)=(.*)$') {
      [void]$safeLines.Add(($Matches[1].TrimEnd() + ' = [PROTEGIDO]'))
    } else {
      [void]$safeLines.Add($line)
    }
  }
  return ($safeLines -join [Environment]::NewLine)
}

function Add-FileToReport {
  param(
    [System.Collections.Generic.List[string]]$Lines,
    [string]$Path,
    [string]$Title
  )

  $Lines.Add('')
  $Lines.Add($Title)
  $Lines.Add(('-' * 80))

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $Lines.Add('[AVISO] Caminho vazio.')
    return
  }
  if (-not (Test-Path $Path -PathType Leaf)) {
    $Lines.Add('[FALHA] Arquivo nao encontrado: ' + $Path)
    return
  }

  try {
    $content = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    $Lines.Add('[OK] Arquivo: ' + $Path)
    $Lines.Add('[OK] Tamanho bytes: ' + ((Get-Item -LiteralPath $Path).Length))
    $Lines.Add('')
    $Lines.Add((Sanitize-Content $content))
  } catch {
    $Lines.Add('[FALHA] Nao foi possivel ler ' + $Path + ': ' + $_.Exception.Message)
  }
}

$php = Resolve-PhpExecutable $PhpExe
$loadedIni = $IniPath
if ([string]::IsNullOrWhiteSpace($loadedIni)) {
  $loadedIni = Invoke-PhpInline $php 'echo (string) php_ini_loaded_file();'
}

$scannedIniRaw = Invoke-PhpInline $php 'echo (string) php_ini_scanned_files();'
$scannedFiles = @()
if (-not [string]::IsNullOrWhiteSpace($scannedIniRaw)) {
  $scannedFiles = @($scannedIniRaw -split ",\s*" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('LEITURA DO PHP.INI - Estrategia')
$lines.Add('Gerado em: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
$lines.Add('Executavel PHP: ' + $php)
$lines.Add('php.ini carregado: ' + ($(if ($loadedIni) { $loadedIni } else { 'nao carregado' })))
$lines.Add('Arquivos INI adicionais: ' + ($(if ($scannedFiles.Count -gt 0) { ($scannedFiles -join '; ') } else { 'nenhum' })))
$lines.Add('')
$lines.Add('Este script e somente leitura. Valores sensiveis sao mascarados por padrao.')

Add-FileToReport -Lines $lines -Path $loadedIni -Title 'PHP.INI PRINCIPAL'

if ($IncludeScannedIni -and $scannedFiles.Count -gt 0) {
  foreach ($file in $scannedFiles) {
    Add-FileToReport -Lines $lines -Path $file.Trim() -Title ('INI ADICIONAL: ' + $file.Trim())
  }
}

$lines.Add('')
$lines.Add('BUSCA RAPIDA POR SQLSRV')
$lines.Add(('-' * 80))
foreach ($file in @($loadedIni) + $scannedFiles) {
  if ([string]::IsNullOrWhiteSpace($file) -or -not (Test-Path $file -PathType Leaf)) { continue }
  $matches = Select-String -LiteralPath $file -Pattern 'sqlsrv|pdo_sqlsrv|extension_dir' -CaseSensitive:$false -ErrorAction SilentlyContinue
  if ($matches) {
    foreach ($match in $matches) {
      $lines.Add(('{0}:{1}: {2}' -f $file, $match.LineNumber, (Sanitize-Content $match.Line.Trim())))
    }
  }
}

$lines.Add('')
$lines.Add('RELATORIO GERADO: ' + $OutputPath)
$lines | Set-Content -LiteralPath $OutputPath -Encoding UTF8

Write-Output ($lines -join [Environment]::NewLine)
Write-Output ''
Write-Output "RELATORIO GERADO: $OutputPath"
