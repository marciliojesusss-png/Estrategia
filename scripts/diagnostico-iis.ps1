<#
.SYNOPSIS
  Compara configuracoes IIS entre Sistema-Expedientes e Estrategia.

.DESCRIPTION
  Diagnostico somente leitura para IIS/FastCGI/PHP. O script nao altera IIS,
  Application Pools, permissoes, arquivos de configuracao ou recursos do Windows.

.EXAMPLE
  .\scripts\diagnostico-iis.ps1 -SiteName "NOME_DO_SITE" -ExpedientesApplication "/Sistema-Expedientes" -EstrategiaApplication "/estrategia"
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SiteName,

  [string]$ExpedientesApplication = '/Sistema-Expedientes',
  [string]$EstrategiaApplication = '/estrategia',

  [string]$ExpedientesDiagnosticUrl = '',
  [string]$EstrategiaDiagnosticUrl = '',
  [string]$DiagnosticKey = '',

  [int]$RecentHours = 24,
  [int]$MaxLogLines = 25,
  [string]$OutputPath = ''
)

$ErrorActionPreference = 'Continue'
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$AppRoot = Split-Path -Parent $ScriptRoot
$LogRoot = Join-Path $AppRoot 'storage\logs'

if (-not (Test-Path $LogRoot -PathType Container)) {
  New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
}
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $timestamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
  $OutputPath = Join-Path $LogRoot ("diagnostico-iis-{0}.log" -f $timestamp)
}

$ReportLines = New-Object System.Collections.Generic.List[string]
$Findings = New-Object System.Collections.Generic.List[object]
$Differences = New-Object System.Collections.Generic.List[string]
$Corrections = New-Object System.Collections.Generic.List[string]

function Add-Line {
  param([string]$Text = '')
  [void]$ReportLines.Add($Text)
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
  param(
    [string]$Status,
    [string]$Section,
    [string]$Label,
    [string]$Detail = '',
    [string]$Correction = '',
    [switch]$Critical
  )

  $safeDetail = Sanitize-Text $Detail
  [void]$Findings.Add([pscustomobject]@{
    Status = $Status
    Section = $Section
    Label = $Label
    Detail = $safeDetail
    Correction = $Correction
    Critical = [bool]$Critical
  })
  $line = "[{0}] {1} - {2}" -f $Status, $Section, $Label
  if (-not [string]::IsNullOrWhiteSpace($safeDetail)) {
    $line += ": $safeDetail"
  }
  Add-Line $line
}

function Add-Difference {
  param([string]$Text, [string]$Correction = '')
  $safe = Sanitize-Text $Text
  [void]$Differences.Add($safe)
  if (-not [string]::IsNullOrWhiteSpace($Correction)) {
    [void]$Corrections.Add((Sanitize-Text $Correction))
  }
}

function Get-Value {
  param([object]$Object, [string]$Name)
  if ($null -eq $Object) { return $null }
  try {
    $property = $Object.PSObject.Properties[$Name]
    if ($null -ne $property) { return $property.Value }
  } catch { }
  try { return $Object.$Name } catch { return $null }
}

function Normalize-AppPath {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return '/' }
  $value = '/' + $Path.Trim('/')
  if ($value -eq '/') { return '/' }
  return $value
}

function Join-IisLocation {
  param([string]$Site, [string]$ApplicationPath)
  if ($ApplicationPath -eq '/') { return $Site }
  return $Site + $ApplicationPath
}

function Expand-IisPath {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return '' }
  return [Environment]::ExpandEnvironmentVariables($Path)
}

function Get-AppCmdPath {
  $path = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
  if (Test-Path $path -PathType Leaf) { return $path }
  return ''
}

function Invoke-AppCmd {
  param([string[]]$Arguments)
  $appcmd = Get-AppCmdPath
  if ($appcmd -eq '') { return '' }
  try {
    $output = & $appcmd @Arguments 2>&1
    return ($output -join "`r`n")
  } catch {
    return $_.Exception.Message
  }
}

function Get-WebConfigCollection {
  param([string]$Filter, [string]$Location = '')
  try {
    if ([string]::IsNullOrWhiteSpace($Location)) {
      return @(Get-WebConfiguration -PSPath 'IIS:\' -Filter $Filter -ErrorAction Stop)
    }
    return @(Get-WebConfiguration -PSPath 'IIS:\' -Location $Location -Filter $Filter -ErrorAction Stop)
  } catch {
    return @()
  }
}

function Get-WebConfigPropertyValue {
  param([string]$Filter, [string]$Name, [string]$Location = '')
  try {
    if ([string]::IsNullOrWhiteSpace($Location)) {
      $value = Get-WebConfigurationProperty -PSPath 'IIS:\' -Filter $Filter -Name $Name -ErrorAction Stop
    } else {
      $value = Get-WebConfigurationProperty -PSPath 'IIS:\' -Location $Location -Filter $Filter -Name $Name -ErrorAction Stop
    }
    if ($null -ne $value -and $null -ne $value.Value) { return $value.Value }
    return $value
  } catch {
    return $null
  }
}

function Test-LocalHandlerDefinition {
  param([string]$PhysicalPath)
  $webConfig = Join-Path $PhysicalPath 'web.config'
  if (-not (Test-Path $webConfig -PathType Leaf)) { return $false }
  try {
    $text = Get-Content -LiteralPath $webConfig -Raw -ErrorAction Stop
    return ($text -match '(?i)<handlers' -and $text -match '(?i)\*\.php') -or $text -match '(?i)FastCgiModule'
  } catch {
    return $false
  }
}

function Get-FastCgiEnvironment {
  param([object]$FastCgi)
  $result = @{}
  if ($null -eq $FastCgi) { return $result }

  $collections = @()
  try {
    if ($null -ne $FastCgi.environmentVariables) { $collections += $FastCgi.environmentVariables.Collection }
  } catch { }
  try {
    $collections += $FastCgi.GetCollection('environmentVariables')
  } catch { }

  foreach ($entry in $collections) {
    $name = [string](Get-Value $entry 'name')
    $value = [string](Get-Value $entry 'value')
    if (-not [string]::IsNullOrWhiteSpace($name)) {
      $result[$name] = $value
    }
  }
  return $result
}

function Get-FastCgiConfig {
  param([string]$PhpCgiPath)
  if ([string]::IsNullOrWhiteSpace($PhpCgiPath)) { return $null }

  $apps = Get-WebConfigCollection -Filter 'system.webServer/fastCgi/application'
  foreach ($app in $apps) {
    $fullPath = [string](Get-Value $app 'fullPath')
    if ($fullPath -ieq $PhpCgiPath) {
      $envVars = Get-FastCgiEnvironment $app
      return [pscustomobject]@{
        Found = $true
        FullPath = $fullPath
        Arguments = [string](Get-Value $app 'arguments')
        ActivityTimeout = [string](Get-Value $app 'activityTimeout')
        RequestTimeout = [string](Get-Value $app 'requestTimeout')
        InstanceMaxRequests = [string](Get-Value $app 'instanceMaxRequests')
        MaxInstances = [string](Get-Value $app 'maxInstances')
        Protocol = [string](Get-Value $app 'protocol')
        QueueLength = [string](Get-Value $app 'queueLength')
        Environment = $envVars
      }
    }
  }

  return [pscustomobject]@{
    Found = $false
    FullPath = $PhpCgiPath
    Arguments = ''
    ActivityTimeout = ''
    RequestTimeout = ''
    InstanceMaxRequests = ''
    MaxInstances = ''
    Protocol = ''
    QueueLength = ''
    Environment = @{}
  }
}

function Get-PoolInfo {
  param([string]$PoolName)

  if ([string]::IsNullOrWhiteSpace($PoolName)) {
    return [pscustomobject]@{
      Name = ''
      IdentityType = ''
      UserName = ''
      Enable32Bit = ''
      State = ''
      Found = $false
    }
  }

  $pool = $null
  try { $pool = Get-Item ("IIS:\AppPools\{0}" -f $PoolName) -ErrorAction Stop } catch { }
  if ($null -eq $pool) {
    return [pscustomobject]@{
      Name = $PoolName
      IdentityType = ''
      UserName = ''
      Enable32Bit = ''
      State = ''
      Found = $false
    }
  }

  $state = ''
  try { $state = (Get-WebAppPoolState -Name $PoolName -ErrorAction Stop).Value } catch { }
  $identityType = [string](Get-Value $pool.processModel 'identityType')
  $userName = [string](Get-Value $pool.processModel 'userName')

  return [pscustomobject]@{
    Name = $PoolName
    IdentityType = $identityType
    UserName = $userName
    Enable32Bit = [string](Get-Value $pool 'enable32BitAppOnWin64')
    State = $state
    Found = $true
  }
}

function Get-HandlerInfo {
  param([string]$Location, [string]$PhysicalPath)

  $handlers = Get-WebConfigCollection -Filter 'system.webServer/handlers/add' -Location $Location
  $phpHandlers = @($handlers | Where-Object {
    ([string](Get-Value $_ 'path')) -ieq '*.php' -or
    ([string](Get-Value $_ 'path')) -match '(?i)\*\.php'
  })
  $handler = $phpHandlers | Select-Object -First 1
  $isLocal = Test-LocalHandlerDefinition $PhysicalPath

  if ($null -eq $handler) {
    return [pscustomobject]@{
      Found = $false
      Name = ''
      Path = ''
      Modules = ''
      ScriptProcessor = ''
      ResourceType = ''
      RequireAccess = ''
      Source = if ($isLocal) { 'local web.config sem handler efetivo' } else { 'nao encontrado' }
    }
  }

  return [pscustomobject]@{
    Found = $true
    Name = [string](Get-Value $handler 'name')
    Path = [string](Get-Value $handler 'path')
    Modules = [string](Get-Value $handler 'modules')
    ScriptProcessor = [string](Get-Value $handler 'scriptProcessor')
    ResourceType = [string](Get-Value $handler 'resourceType')
    RequireAccess = [string](Get-Value $handler 'requireAccess')
    Source = if ($isLocal) { 'local web.config' } else { 'herdado/servidor' }
  }
}

function Test-DefaultDocument {
  param([string]$Location)
  $docs = Get-WebConfigCollection -Filter 'system.webServer/defaultDocument/files/add' -Location $Location
  foreach ($doc in $docs) {
    if ([string](Get-Value $doc 'value') -ieq 'index.php') { return $true }
  }
  return $false
}

function Get-AuthInfo {
  param([string]$Location)
  $windows = Get-WebConfigPropertyValue -Filter 'system.webServer/security/authentication/windowsAuthentication' -Name 'enabled' -Location $Location
  $anonymous = Get-WebConfigPropertyValue -Filter 'system.webServer/security/authentication/anonymousAuthentication' -Name 'enabled' -Location $Location
  return [pscustomobject]@{
    Windows = [string]$windows
    Anonymous = [string]$anonymous
  }
}

function Get-SectionStatus {
  param([string]$SectionPath, [string]$Location)
  try {
    $section = Get-WebConfigurationSection -PSPath 'IIS:\' -Location $Location -Filter $SectionPath -ErrorAction Stop
    $override = [string](Get-Value $section 'overrideModeEffective')
    if ([string]::IsNullOrWhiteSpace($override)) { $override = [string](Get-Value $section 'overrideMode') }
    if ([string]::IsNullOrWhiteSpace($override)) { $override = 'nao informado' }
    return $override
  } catch {
    return 'indisponivel ou bloqueado: ' + $_.Exception.Message
  }
}

function Get-CandidateAppRoot {
  param([string]$PhysicalPath)
  if ([string]::IsNullOrWhiteSpace($PhysicalPath)) { return '' }
  $path = $PhysicalPath.TrimEnd('\', '/')
  if ((Split-Path -Leaf $path) -ieq 'public') {
    return Split-Path -Parent $path
  }
  return $path
}

function Get-PoolAclIdentities {
  param([object]$Pool)
  $ids = New-Object System.Collections.Generic.List[string]
  if ($null -eq $Pool) { return @() }
  if (-not [string]::IsNullOrWhiteSpace($Pool.Name)) {
    [void]$ids.Add("IIS AppPool\$($Pool.Name)")
  }
  if (-not [string]::IsNullOrWhiteSpace($Pool.UserName)) {
    [void]$ids.Add($Pool.UserName)
  }
  [void]$ids.Add('BUILTIN\IIS_IUSRS')
  [void]$ids.Add('IIS_IUSRS')
  [void]$ids.Add('NT AUTHORITY\NETWORK SERVICE')
  [void]$ids.Add('NETWORK SERVICE')
  [void]$ids.Add('Everyone')
  [void]$ids.Add('Todos')
  return @($ids | Select-Object -Unique)
}

function Test-AclRight {
  param([string]$Path, [object]$Pool, [string]$Kind)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return [pscustomobject]@{ Status = 'FALHA'; Detail = 'caminho vazio' }
  }
  if (-not (Test-Path $Path)) {
    return [pscustomobject]@{ Status = 'FALHA'; Detail = "nao encontrado: $Path" }
  }
  try {
    $acl = Get-Acl -LiteralPath $Path -ErrorAction Stop
    $identities = Get-PoolAclIdentities $Pool
    $requiredRights = if ($Kind -eq 'write') {
      @(
        [System.Security.AccessControl.FileSystemRights]::Write,
        [System.Security.AccessControl.FileSystemRights]::Modify,
        [System.Security.AccessControl.FileSystemRights]::FullControl
      )
    } else {
      @(
        [System.Security.AccessControl.FileSystemRights]::Read,
        [System.Security.AccessControl.FileSystemRights]::ReadAndExecute,
        [System.Security.AccessControl.FileSystemRights]::FullControl
      )
    }

    foreach ($rule in $acl.Access) {
      if ($rule.AccessControlType -ne 'Allow') { continue }
      $identity = [string]$rule.IdentityReference
      $matchedIdentity = $false
      foreach ($candidate in $identities) {
        if ($identity -ieq $candidate -or $identity -like "*\$candidate") {
          $matchedIdentity = $true
          break
        }
      }
      if (-not $matchedIdentity) { continue }
      foreach ($right in $requiredRights) {
        if (($rule.FileSystemRights -band $right) -ne 0) {
          return [pscustomobject]@{ Status = 'OK'; Detail = "$Kind permitido por ACL para $identity em $Path" }
        }
      }
    }

    return [pscustomobject]@{ Status = 'AVISO'; Detail = "nao foi encontrada permissao $Kind explicita para o Pool/IIS_IUSRS em $Path" }
  } catch {
    return [pscustomobject]@{ Status = 'AVISO'; Detail = "nao foi possivel ler ACL de ${Path}: $($_.Exception.Message)" }
  }
}

function Get-WritableCandidates {
  param([string]$AppRoot)
  if ([string]::IsNullOrWhiteSpace($AppRoot)) { return @{} }
  return @{
    'storage/logs' = Join-Path $AppRoot 'storage\logs'
    'storage/temporarios' = Join-Path $AppRoot 'storage\temporarios'
    'storage/backups' = Join-Path $AppRoot 'storage\backups'
    'uploads/evidencias' = Join-Path $AppRoot 'uploads\evidencias'
    'logs' = Join-Path $AppRoot 'logs'
    'uploads' = Join-Path $AppRoot 'uploads'
  }
}

function Test-UncAccessForPool {
  param([string]$PhysicalPath, [object]$Pool)
  if ([string]::IsNullOrWhiteSpace($PhysicalPath) -or $PhysicalPath -notmatch '^\\\\') {
    return [pscustomobject]@{ Status = 'OK'; Detail = 'nao usa caminho UNC' }
  }
  $currentAccess = Test-Path $PhysicalPath
  $identity = if ($Pool.UserName) { $Pool.UserName } else { $Pool.IdentityType }
  if ($currentAccess) {
    return [pscustomobject]@{
      Status = 'AVISO'
      Detail = "UNC acessivel pelo usuario atual; valide permissao no contexto do Pool ($identity)"
    }
  }
  return [pscustomobject]@{
    Status = 'FALHA'
    Detail = "UNC nao acessivel pelo usuario atual; tambem validar contexto do Pool ($identity): $PhysicalPath"
  }
}

function Get-IisLogs {
  param([object]$Site, [string[]]$ApplicationPaths)
  $items = New-Object System.Collections.Generic.List[string]
  if ($null -eq $Site) { return @() }

  $siteId = [string](Get-Value $Site 'id')
  $directory = ''
  try { $directory = [string]$Site.logFile.directory } catch { }
  if ([string]::IsNullOrWhiteSpace($directory)) {
    $directory = '%SystemDrive%\inetpub\logs\LogFiles'
  }
  $directory = Expand-IisPath $directory
  $logDir = Join-Path $directory ("W3SVC{0}" -f $siteId)
  if (-not (Test-Path $logDir -PathType Container)) { return @("diretorio de logs IIS nao encontrado: $logDir") }

  try {
    $files = Get-ChildItem -LiteralPath $logDir -Filter '*.log' -ErrorAction Stop |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 3
    foreach ($file in $files) {
      $lines = Get-Content -LiteralPath $file.FullName -Tail 200 -ErrorAction Stop
      foreach ($line in $lines) {
        if ($line.StartsWith('#')) { continue }
        foreach ($appPath in $ApplicationPaths) {
          if ($line -match [regex]::Escape($appPath.TrimEnd('/'))) {
            [void]$items.Add(("{0}: {1}" -f $file.Name, $line))
            break
          }
        }
        if ($items.Count -ge $MaxLogLines) { break }
      }
      if ($items.Count -ge $MaxLogLines) { break }
    }
  } catch {
    [void]$items.Add("falha ao ler logs IIS: $($_.Exception.Message)")
  }
  return @($items)
}

function Get-WindowsEvents {
  param([string[]]$Needles)
  $items = New-Object System.Collections.Generic.List[string]
  $start = (Get-Date).AddHours(-1 * [Math]::Max(1, $RecentHours))
  try {
    $events = Get-WinEvent -FilterHashtable @{ LogName = 'Application'; StartTime = $start } -MaxEvents 250 -ErrorAction Stop
    foreach ($event in $events) {
      $message = [string]$event.Message
      $provider = [string]$event.ProviderName
      $combined = "$provider $message"
      $matched = $false
      foreach ($needle in $Needles) {
        if (-not [string]::IsNullOrWhiteSpace($needle) -and $combined -match [regex]::Escape($needle)) {
          $matched = $true
          break
        }
      }
      if (-not $matched -and $combined -match '(?i)(IIS|FastCGI|php-cgi|php\.exe|w3wp|erro 500|500\.|Application pool|WAS)') {
        $matched = $true
      }
      if ($matched) {
        [void]$items.Add(("{0:u} {1} {2}: {3}" -f $event.TimeCreated, $event.LevelDisplayName, $provider, (Sanitize-Text $message)))
      }
      if ($items.Count -ge $MaxLogLines) { break }
    }
  } catch {
    [void]$items.Add("falha ao consultar eventos do Windows: $($_.Exception.Message)")
  }
  return @($items)
}

function Get-FailedRequestTracing {
  param([string]$Site)
  $filter = "system.applicationHost/sites/site[@name='$Site']/traceFailedRequestsLogging"
  $enabled = Get-WebConfigPropertyValue -Filter $filter -Name 'enabled'
  $directory = Get-WebConfigPropertyValue -Filter $filter -Name 'directory'
  return [pscustomobject]@{
    Enabled = [string]$enabled
    Directory = [string](Expand-IisPath ([string]$directory))
  }
}

function Add-KeyValueLines {
  param([string]$Section, [hashtable]$Values)
  foreach ($key in ($Values.Keys | Sort-Object)) {
    Add-Item -Status 'OK' -Section $Section -Label $key -Detail ([string]$Values[$key]) -Critical:$false
  }
}

function Invoke-PhpDiagnostic {
  param([string]$Name, [string]$Url, [string]$Key)

  $result = @{
    Available = $false
    Raw = ''
    StatusCode = ''
    Values = @{}
  }
  if ([string]::IsNullOrWhiteSpace($Url)) {
    Add-Item -Status 'AVISO' -Section $Name -Label 'diagnostico PHP HTTP' -Detail 'URL nao informada' -Correction 'Informe -ExpedientesDiagnosticUrl ou -EstrategiaDiagnosticUrl para comparar PHP via HTTP.' -Critical:$false
    return $result
  }

  $uri = $Url
  if (-not [string]::IsNullOrWhiteSpace($Key) -and $uri -notmatch '(?i)([?&](chave|key)=)') {
    $separator = if ($uri.Contains('?')) { '&' } else { '?' }
    $uri = $uri + $separator + 'chave=' + [Uri]::EscapeDataString($Key)
  }

  try {
    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Key)) {
      $headers['X-Diagnostico-Chave'] = $Key
    }
    $response = Invoke-WebRequest -Uri $uri -Headers $headers -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
    $text = [string]$response.Content
    $result.Available = $true
    $result.Raw = $text
    $result.StatusCode = [string]$response.StatusCode
    $result.Values = Parse-PhpDiagnosticText $text
    Add-Item -Status 'OK' -Section $Name -Label 'diagnostico PHP HTTP' -Detail ("HTTP {0}" -f $response.StatusCode) -Critical:$false
  } catch {
    Add-Item -Status 'AVISO' -Section $Name -Label 'diagnostico PHP HTTP' -Detail $_.Exception.Message -Correction 'Habilite temporariamente o diagnostico web protegido e informe URL/chave.' -Critical:$false
  }

  return $result
}

function Parse-PhpDiagnosticText {
  param([string]$Text)
  $values = @{}
  $lines = $Text -split "`r?`n"
  foreach ($line in $lines) {
    if ($line -match '^\[(OK|AVISO|FALHA)\]\s+(.+?)\s+-\s+([^:]+)(?::\s*(.*))?$') {
      $key = (($Matches[2].Trim()) + ' - ' + ($Matches[3].Trim()))
      $values[$key] = [pscustomobject]@{
        Status = $Matches[1]
        Detail = if ($Matches.Count -ge 5) { $Matches[4] } else { '' }
      }
    }
  }
  return $values
}

function Get-DiagnosticValue {
  param([hashtable]$Values, [string]$Key)
  if ($Values.ContainsKey($Key)) { return [string]$Values[$Key].Detail }
  return ''
}

function Add-PhpDiagnosticSummary {
  param([string]$Name, [hashtable]$Values)

  $map = @{
    'versao PHP' = 'PHP - Versao do PHP'
    'SAPI' = 'PHP - SAPI'
    'PHP_BINARY' = 'PHP - executavel PHP'
    'php.ini' = 'PHP - php.ini carregado'
    'sqlsrv' = 'PHP - extensao sqlsrv'
    'sqlsrv_connect' = 'PHP - funcao sqlsrv_connect'
    'REMOTE_USER' = 'IIS - REMOTE_USER'
  }

  foreach ($label in ($map.Keys | Sort-Object)) {
    $value = Get-DiagnosticValue -Values $Values -Key $map[$label]
    if ($value -eq '') {
      Add-Item -Status 'AVISO' -Section $Name -Label ("PHP HTTP {0}" -f $label) -Detail 'nao informado pelo diagnostico web' -Critical:$false
    } else {
      Add-Item -Status 'OK' -Section $Name -Label ("PHP HTTP {0}" -f $label) -Detail $value -Critical:$false
    }
  }

  foreach ($label in @('arquivos INI adicionais', 'extension_dir', 'arquitetura', 'TS/NTS')) {
    Add-Item -Status 'AVISO' -Section $Name -Label ("PHP HTTP {0}" -f $label) -Detail 'nao exposto pelo diagnostico web atual' -Critical:$false
  }
}

function Get-ApplicationDiagnostics {
  param([string]$Name, [string]$ApplicationPath)

  $appPath = Normalize-AppPath $ApplicationPath
  $location = Join-IisLocation -Site $SiteName -ApplicationPath $appPath
  $siteFilter = "system.applicationHost/sites/site[@name='$SiteName']"
  $appFilter = "$siteFilter/application[@path='$appPath']"
  $vdirFilter = "$appFilter/virtualDirectory[@path='/']"

  Add-Line ''
  Add-Line ("APLICACAO: {0}" -f $Name)
  Add-Line ("-" * 80)

  $physical = [string](Get-WebConfigPropertyValue -Filter $vdirFilter -Name 'physicalPath')
  $physical = Expand-IisPath $physical
  $poolName = [string](Get-WebConfigPropertyValue -Filter $appFilter -Name 'applicationPool')
  $pool = Get-PoolInfo $poolName
  $handler = Get-HandlerInfo -Location $location -PhysicalPath $physical
  $fastCgi = Get-FastCgiConfig -PhpCgiPath $handler.ScriptProcessor
  $auth = Get-AuthInfo -Location $location
  $defaultIndex = Test-DefaultDocument -Location $location
  $appRoot = Get-CandidateAppRoot $physical
  $unc = Test-UncAccessForPool -PhysicalPath $physical -Pool $pool

  Add-Item -Status 'OK' -Section $Name -Label 'site' -Detail $SiteName -Critical:$false
  Add-Item -Status 'OK' -Section $Name -Label 'caminho da aplicacao' -Detail $appPath -Critical:$false
  Add-Item -Status ($(if ($physical) { 'OK' } else { 'FALHA' })) -Section $Name -Label 'caminho fisico' -Detail ($(if ($physical) { $physical } else { 'nao encontrado' })) -Correction 'Revise o caminho fisico da aplicacao no IIS.' -Critical:(!$physical)
  Add-Item -Status ($(if ($pool.Found) { 'OK' } else { 'FALHA' })) -Section $Name -Label 'Application Pool' -Detail $pool.Name -Correction 'Associe a aplicacao a um Application Pool existente.' -Critical:(!$pool.Found)
  Add-Item -Status 'OK' -Section $Name -Label 'identidade do Pool' -Detail ($(if ($pool.UserName) { "$($pool.IdentityType) / $($pool.UserName)" } else { $pool.IdentityType })) -Critical:$false
  Add-Item -Status 'OK' -Section $Name -Label 'enable32BitAppOnWin64' -Detail $pool.Enable32Bit -Critical:$false
  Add-Item -Status ($(if ($pool.State -eq 'Started') { 'OK' } else { 'AVISO' })) -Section $Name -Label 'estado do Pool' -Detail $pool.State -Correction 'Inicie o Pool se a aplicacao precisa responder agora.' -Critical:$false

  Add-Item -Status ($(if ($handler.Found) { 'OK' } else { 'FALHA' })) -Section $Name -Label 'handler *.php' -Detail ($(if ($handler.Found) { "$($handler.Name) path=$($handler.Path)" } else { 'nao encontrado' })) -Correction 'Configure handler *.php apontando para FastCgiModule/php-cgi.exe.' -Critical:(!$handler.Found)
  Add-Item -Status ($(if ($handler.Modules -match 'FastCgiModule') { 'OK' } else { 'FALHA' })) -Section $Name -Label 'modulo PHP' -Detail $handler.Modules -Correction 'Use FastCgiModule para PHP no IIS.' -Critical:($handler.Modules -notmatch 'FastCgiModule')
  Add-Item -Status ($(if ($handler.ScriptProcessor) { 'OK' } else { 'FALHA' })) -Section $Name -Label 'php-cgi.exe' -Detail $handler.ScriptProcessor -Correction 'Configure o caminho do php-cgi.exe no handler PHP.' -Critical:(!$handler.ScriptProcessor)
  Add-Item -Status 'OK' -Section $Name -Label 'origem do handler' -Detail $handler.Source -Critical:$false

  Add-Item -Status ($(if ($fastCgi.Found) { 'OK' } else { 'FALHA' })) -Section $Name -Label 'FastCGI correspondente' -Detail ($(if ($fastCgi.Found) { $fastCgi.FullPath } else { 'nao encontrado para o php-cgi.exe' })) -Correction 'Crie/ajuste entrada FastCGI correspondente ao php-cgi.exe usado pelo handler.' -Critical:(!$fastCgi.Found)
  Add-Item -Status 'OK' -Section $Name -Label 'FastCGI argumentos' -Detail $fastCgi.Arguments -Critical:$false
  Add-Item -Status 'OK' -Section $Name -Label 'FastCGI limites' -Detail ("activityTimeout={0}; requestTimeout={1}; instanceMaxRequests={2}; maxInstances={3}; queueLength={4}; protocol={5}" -f $fastCgi.ActivityTimeout, $fastCgi.RequestTimeout, $fastCgi.InstanceMaxRequests, $fastCgi.MaxInstances, $fastCgi.QueueLength, $fastCgi.Protocol) -Critical:$false
  foreach ($envName in @('PHPRC', 'PHP_INI_SCAN_DIR', 'PHP_FCGI_MAX_REQUESTS')) {
    $envValue = ''
    if ($fastCgi.Environment.ContainsKey($envName)) { $envValue = [string]$fastCgi.Environment[$envName] }
    Add-Item -Status ($(if ($envValue) { 'OK' } else { 'AVISO' })) -Section $Name -Label ("FastCGI env {0}" -f $envName) -Detail ($(if ($envValue) { $envValue } else { 'nao configurado' })) -Critical:$false
  }

  Add-Item -Status 'OK' -Section $Name -Label 'Windows Authentication' -Detail $auth.Windows -Critical:$false
  Add-Item -Status 'OK' -Section $Name -Label 'Anonymous Authentication' -Detail $auth.Anonymous -Critical:$false
  Add-Item -Status ($(if ($defaultIndex) { 'OK' } else { 'FALHA' })) -Section $Name -Label 'documento padrao index.php' -Detail ($(if ($defaultIndex) { 'index.php encontrado' } else { 'index.php ausente' })) -Correction 'Inclua index.php nos documentos padrao do IIS.' -Critical:(!$defaultIndex)

  $webConfigPath = if ($physical) { Join-Path $physical 'web.config' } else { '' }
  Add-Item -Status ($(if ($webConfigPath -and (Test-Path $webConfigPath -PathType Leaf)) { 'OK' } else { 'AVISO' })) -Section $Name -Label 'web.config da aplicacao' -Detail ($(if ($webConfigPath) { $webConfigPath } else { 'caminho fisico nao encontrado' })) -Critical:$false
  $rootWebConfig = if ($appRoot) { Join-Path $appRoot 'web.config' } else { '' }
  Add-Item -Status ($(if ($rootWebConfig -and (Test-Path $rootWebConfig -PathType Leaf)) { 'OK' } else { 'AVISO' })) -Section $Name -Label 'web.config da raiz fisica' -Detail ($(if ($rootWebConfig) { $rootWebConfig } else { 'raiz fisica nao encontrada' })) -Critical:$false

  foreach ($section in @('system.webServer/handlers', 'system.webServer/defaultDocument', 'system.webServer/security/authentication/windowsAuthentication', 'system.webServer/security/authentication/anonymousAuthentication')) {
    Add-Item -Status 'OK' -Section $Name -Label ("secao IIS {0}" -f $section) -Detail (Get-SectionStatus -SectionPath $section -Location $location) -Critical:$false
  }

  $read = Test-AclRight -Path $physical -Pool $pool -Kind 'read'
  Add-Item -Status $read.Status -Section $Name -Label 'permissao leitura caminho fisico' -Detail $read.Detail -Correction 'Conceda leitura para a identidade do Pool ou IIS_IUSRS.' -Critical:($read.Status -eq 'FALHA')
  $uncCritical = $unc.Status -eq 'FALHA'
  Add-Item -Status $unc.Status -Section $Name -Label 'acesso UNC pelo Pool' -Detail $unc.Detail -Correction 'Conceda permissao no compartilhamento e NTFS para a identidade do Pool ou conta de servico.' -Critical:$uncCritical

  $writeCandidates = Get-WritableCandidates -AppRoot $appRoot
  foreach ($label in ($writeCandidates.Keys | Sort-Object)) {
    $path = [string]$writeCandidates[$label]
    if (-not (Test-Path $path)) { continue }
    $write = Test-AclRight -Path $path -Pool $pool -Kind 'write'
    Add-Item -Status $write.Status -Section $Name -Label ("permissao escrita {0}" -f $label) -Detail $write.Detail -Correction 'Conceda Modify/Write para a identidade do Pool nessa pasta.' -Critical:($write.Status -eq 'FALHA')
  }

  return [pscustomobject]@{
    Name = $Name
    ApplicationPath = $appPath
    Location = $location
    PhysicalPath = $physical
    AppRoot = $appRoot
    Pool = $pool
    Handler = $handler
    FastCgi = $fastCgi
    Auth = $auth
    DefaultIndex = $defaultIndex
    WebConfig = $webConfigPath
    RootWebConfig = $rootWebConfig
    UsesUnc = ($physical -match '^\\\\')
  }
}

function Compare-Value {
  param([string]$Label, [object]$Left, [object]$Right, [string]$Correction = '')
  $leftText = [string]$Left
  $rightText = [string]$Right
  if ($leftText -ne $rightText) {
    Add-Difference ("{0}: Sistema-Expedientes='{1}' | Estrategia='{2}'" -f $Label, $leftText, $rightText) $Correction
  }
}

function Add-Comparisons {
  param([object]$Expedientes, [object]$Estrategia, [hashtable]$ExpPhp, [hashtable]$EstPhp)

  Add-Line ''
  Add-Line 'DIFERENCAS ENTRE SISTEMA-EXPEDIENTES E ESTRATEGIA'
  Add-Line ('-' * 80)

  Compare-Value 'php-cgi.exe diferente' $Expedientes.Handler.ScriptProcessor $Estrategia.Handler.ScriptProcessor 'Use o mesmo php-cgi.exe se as aplicacoes devem rodar com a mesma pilha PHP.'
  Compare-Value 'Application Pool diferente' $Expedientes.Pool.Name $Estrategia.Pool.Name 'Compare identidade, arquitetura e FastCGI dos Pools antes de publicar.'
  Compare-Value 'identidade do Pool diferente' ($(if ($Expedientes.Pool.UserName) { $Expedientes.Pool.UserName } else { $Expedientes.Pool.IdentityType })) ($(if ($Estrategia.Pool.UserName) { $Estrategia.Pool.UserName } else { $Estrategia.Pool.IdentityType })) 'Alinhe permissao de UNC/NTFS e autenticacao conforme a aplicacao de referencia.'
  Compare-Value 'arquitetura enable32BitAppOnWin64 diferente' $Expedientes.Pool.Enable32Bit $Estrategia.Pool.Enable32Bit 'Use arquitetura compativel com a extensao sqlsrv instalada.'
  Compare-Value 'PHPRC diferente' $Expedientes.FastCgi.Environment['PHPRC'] $Estrategia.FastCgi.Environment['PHPRC'] 'Alinhe PHPRC quando o php.ini esperado estiver em outro diretorio.'
  Compare-Value 'PHP_INI_SCAN_DIR diferente' $Expedientes.FastCgi.Environment['PHP_INI_SCAN_DIR'] $Estrategia.FastCgi.Environment['PHP_INI_SCAN_DIR'] 'Alinhe diretorios adicionais de INI se extensoes carregam em apenas uma aplicacao.'
  Compare-Value 'FastCGI herdado/configurado de forma diferente' $Expedientes.Handler.Source $Estrategia.Handler.Source 'Revise web.config e configuracao global de handlers.'
  Compare-Value 'Windows Authentication diferente' $Expedientes.Auth.Windows $Estrategia.Auth.Windows 'A Estrategia depende de REMOTE_USER; valide Windows Authentication.'
  Compare-Value 'Anonymous Authentication diferente' $Expedientes.Auth.Anonymous $Estrategia.Auth.Anonymous 'Evite autenticacao anonima ativa quando o fluxo depende de identidade corporativa.'

  $expPhpIni = Get-DiagnosticValue -Values $ExpPhp -Key 'PHP - php.ini carregado'
  $estPhpIni = Get-DiagnosticValue -Values $EstPhp -Key 'PHP - php.ini carregado'
  Compare-Value 'php.ini diferente' $expPhpIni $estPhpIni 'Alinhe o php.ini quando sqlsrv ou parametros de erro diferirem.'

  $expPhpVersion = Get-DiagnosticValue -Values $ExpPhp -Key 'PHP - Versao do PHP'
  $estPhpVersion = Get-DiagnosticValue -Values $EstPhp -Key 'PHP - Versao do PHP'
  Compare-Value 'versao PHP diferente' $expPhpVersion $estPhpVersion 'Use versoes compatíveis com as extensoes habilitadas.'

  $expBinary = Get-DiagnosticValue -Values $ExpPhp -Key 'PHP - executavel PHP'
  $estBinary = Get-DiagnosticValue -Values $EstPhp -Key 'PHP - executavel PHP'
  Compare-Value 'PHP_BINARY diferente' $expBinary $estBinary 'Valide se o IIS usa o mesmo php-cgi.exe esperado.'

  $expSqlsrv = Get-DiagnosticValue -Values $ExpPhp -Key 'PHP - extensao sqlsrv'
  $estSqlsrv = Get-DiagnosticValue -Values $EstPhp -Key 'PHP - extensao sqlsrv'
  Compare-Value 'sqlsrv carregado somente em uma aplicacao' $expSqlsrv $estSqlsrv 'Habilite sqlsrv no php.ini usado pela Estrategia.'

  $expRemoteUser = Get-DiagnosticValue -Values $ExpPhp -Key 'IIS - REMOTE_USER'
  $estRemoteUser = Get-DiagnosticValue -Values $EstPhp -Key 'IIS - REMOTE_USER'
  Compare-Value 'REMOTE_USER diferente' $expRemoteUser $estRemoteUser 'Revise Windows Authentication, provedores e delegacao.'

  if ($Estrategia.ApplicationPath -match '(?i)public' -or (Split-Path -Leaf ($Estrategia.PhysicalPath.TrimEnd('\', '/'))) -ieq 'public') {
    Add-Difference 'Estrategia esta apontando diretamente para a pasta public como aplicacao IIS.' 'Isso pode ser correto, mas confirme que app_base_path e assets foram testados nesse formato.'
  }

  try {
    $apps = @(Get-WebApplication -Site $SiteName -ErrorAction Stop)
    $children = @($apps | Where-Object {
      ([string]$_.Path).StartsWith($Estrategia.ApplicationPath.TrimEnd('/') + '/', [System.StringComparison]::OrdinalIgnoreCase)
    })
    if ($children.Count -gt 0) {
      Add-Difference ("Estrategia possui aplicacoes filhas no IIS: {0}" -f (($children | ForEach-Object { $_.Path }) -join ', ')) 'Remova aplicacoes filhas acidentais, especialmente public, se a Estrategia deve ser uma unica aplicacao.'
    }
  } catch { }

  if ($Differences.Count -eq 0) {
    Add-Line '[OK] Nenhuma diferenca relevante detectada nos itens comparados.'
  } else {
    foreach ($difference in $Differences) {
      Add-Line ("[DIFERENCA] {0}" -f $difference)
    }
  }
}

function Add-500CausesAndCorrections {
  Add-Line ''
  Add-Line 'POSSIVEIS CAUSAS DO ERRO 500'
  Add-Line ('-' * 80)
  $causes = @($Findings | Where-Object {
    $_.Status -eq 'FALHA' -or
    ($_.Status -eq 'AVISO' -and $_.Label -match '(FastCGI|php|sqlsrv|UNC|permissao|Authentication|Pool)')
  })
  if ($causes.Count -eq 0 -and $Differences.Count -eq 0) {
    Add-Line '- Nenhuma causa provavel detectada no diagnostico IIS comparativo.'
  } else {
    foreach ($cause in $causes) {
      Add-Line ("- {0} - {1}: {2}" -f $cause.Section, $cause.Label, $cause.Detail)
    }
    foreach ($difference in $Differences) {
      Add-Line ("- DIFERENCA: {0}" -f $difference)
    }
  }

  Add-Line ''
  Add-Line 'CORRECOES RECOMENDADAS'
  Add-Line ('-' * 80)
  $unique = New-Object System.Collections.Generic.HashSet[string]
  foreach ($item in $Findings) {
    if (($item.Status -eq 'FALHA' -or $item.Status -eq 'AVISO') -and -not [string]::IsNullOrWhiteSpace($item.Correction)) {
      [void]$unique.Add($item.Correction)
    }
  }
  foreach ($correction in $Corrections) {
    if (-not [string]::IsNullOrWhiteSpace($correction)) { [void]$unique.Add($correction) }
  }
  if ($unique.Count -eq 0) {
    Add-Line '- Nenhuma correcao automatica recomendada.'
  } else {
    foreach ($line in $unique) {
      Add-Line ("- {0}" -f $line)
    }
  }
}

$ExpedientesApplication = Normalize-AppPath $ExpedientesApplication
$EstrategiaApplication = Normalize-AppPath $EstrategiaApplication

Add-Line 'DIAGNOSTICO COMPARATIVO DO IIS - Sistema-Expedientes x Estrategia'
Add-Line ("Gerado em: {0:yyyy-MM-dd HH:mm:ss}" -f (Get-Date))
Add-Line ("Host: {0}" -f $env:COMPUTERNAME)
Add-Line ("Site: {0}" -f $SiteName)
Add-Line ("Periodo de logs/eventos: ultimas {0} hora(s)" -f $RecentHours)
Add-Line ''
Add-Line 'Este script e somente diagnostico. Nenhuma configuracao foi alterada.'
Add-Line ''

$webAdminLoaded = $false
try {
  Import-Module WebAdministration -ErrorAction Stop
  $webAdminLoaded = $true
  Add-Item -Status 'OK' -Section 'IIS' -Label 'modulo WebAdministration' -Detail 'carregado' -Critical:$false
} catch {
  Add-Item -Status 'FALHA' -Section 'IIS' -Label 'modulo WebAdministration' -Detail $_.Exception.Message -Correction 'Execute em servidor com IIS Management Scripts and Tools instalado.' -Critical
}

$site = $null
if ($webAdminLoaded) {
  try {
    $site = Get-Website -Name $SiteName -ErrorAction Stop
    Add-Item -Status 'OK' -Section 'IIS' -Label 'site encontrado' -Detail ("id={0}; state={1}; physicalPath={2}" -f $site.id, $site.state, (Expand-IisPath ([string]$site.physicalPath))) -Critical:$false
  } catch {
    Add-Item -Status 'FALHA' -Section 'IIS' -Label 'site encontrado' -Detail $_.Exception.Message -Correction 'Informe -SiteName com o nome exato do site no IIS.' -Critical
  }
}

$appcmdPath = Get-AppCmdPath
Add-Item -Status ($(if ($appcmdPath) { 'OK' } else { 'AVISO' })) -Section 'IIS' -Label 'appcmd.exe' -Detail ($(if ($appcmdPath) { $appcmdPath } else { 'nao encontrado' })) -Correction 'appcmd.exe fica normalmente em %windir%\System32\inetsrv.' -Critical:$false

if (-not $webAdminLoaded -or $null -eq $site) {
  Add-Line ''
  Add-Line 'SAIDA APPCMD DISPONIVEL'
  Add-Line ('-' * 80)
  Add-Line (Sanitize-Text (Invoke-AppCmd @('list', 'site', $SiteName)))
  Add-500CausesAndCorrections
  $ReportLines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
  Write-Output ($ReportLines -join [Environment]::NewLine)
  Write-Output ""
  Write-Output "RELATORIO GERADO: $OutputPath"
  exit 1
}

$exp = Get-ApplicationDiagnostics -Name 'Sistema-Expedientes' -ApplicationPath $ExpedientesApplication
$est = Get-ApplicationDiagnostics -Name 'Estrategia' -ApplicationPath $EstrategiaApplication

Add-Line ''
Add-Line 'FAILED REQUEST TRACING'
Add-Line ('-' * 80)
$frt = Get-FailedRequestTracing -Site $SiteName
Add-Item -Status 'OK' -Section 'IIS' -Label 'Failed Request Tracing' -Detail ("enabled={0}; directory={1}" -f $frt.Enabled, $frt.Directory) -Critical:$false

Add-Line ''
Add-Line 'LOGS RECENTES DO IIS'
Add-Line ('-' * 80)
$iisLogs = Get-IisLogs -Site $site -ApplicationPaths @($ExpedientesApplication, $EstrategiaApplication)
if ($iisLogs.Count -eq 0) {
  Add-Item -Status 'AVISO' -Section 'LOG IIS' -Label 'linhas recentes' -Detail 'nenhuma linha encontrada para as aplicacoes informadas' -Critical:$false
} else {
  foreach ($logLine in $iisLogs) {
    Add-Item -Status 'OK' -Section 'LOG IIS' -Label 'linha recente' -Detail $logLine -Critical:$false
  }
}

Add-Line ''
Add-Line 'EVENTOS RECENTES DO WINDOWS'
Add-Line ('-' * 80)
$eventNeedles = @($SiteName, $exp.Pool.Name, $est.Pool.Name, $exp.Handler.ScriptProcessor, $est.Handler.ScriptProcessor)
$events = Get-WindowsEvents -Needles $eventNeedles
if ($events.Count -eq 0) {
  Add-Item -Status 'AVISO' -Section 'EVENTOS' -Label 'Windows Application' -Detail 'nenhum evento relevante encontrado' -Critical:$false
} else {
  foreach ($eventLine in $events) {
    Add-Item -Status 'OK' -Section 'EVENTOS' -Label 'evento recente' -Detail $eventLine -Critical:$false
  }
}

Add-Line ''
Add-Line 'COMPARACAO PHP VIA HTTP'
Add-Line ('-' * 80)
$expHttp = Invoke-PhpDiagnostic -Name 'Sistema-Expedientes' -Url $ExpedientesDiagnosticUrl -Key $DiagnosticKey
$estHttp = Invoke-PhpDiagnostic -Name 'Estrategia' -Url $EstrategiaDiagnosticUrl -Key $DiagnosticKey
if ($expHttp.Available) { Add-PhpDiagnosticSummary -Name 'Sistema-Expedientes' -Values $expHttp.Values }
if ($estHttp.Available) { Add-PhpDiagnosticSummary -Name 'Estrategia' -Values $estHttp.Values }

Add-Comparisons -Expedientes $exp -Estrategia $est -ExpPhp $expHttp.Values -EstPhp $estHttp.Values
Add-500CausesAndCorrections

Add-Line ''
Add-Line ("RELATORIO GERADO: {0}" -f $OutputPath)

$ReportLines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Output ($ReportLines -join [Environment]::NewLine)
Write-Output ""
Write-Output "RELATORIO GERADO: $OutputPath"

$criticalFailures = @($Findings | Where-Object { $_.Status -eq 'FALHA' -and $_.Critical })
if ($criticalFailures.Count -gt 0) { exit 1 }
exit 0
