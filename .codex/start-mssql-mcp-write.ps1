Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-TomlSectionValues {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Section
    )

    $values = @{}
    $insideSection = $false

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()

        if ($trimmed -match '^\[(.+)\]$') {
            $insideSection = $Matches[1] -eq $Section
            continue
        }

        if (-not $insideSection -or $trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) {
            continue
        }

        if ($trimmed -notmatch '^([A-Za-z0-9_]+)\s*=\s*(.+)$') {
            continue
        }

        $key = $Matches[1]
        $rawValue = $Matches[2].Trim()

        if ($rawValue.StartsWith('"') -and $rawValue.EndsWith('"')) {
            $values[$key] = $rawValue | ConvertFrom-Json
            continue
        }

        if ($rawValue.StartsWith("'") -and $rawValue.EndsWith("'")) {
            $values[$key] = $rawValue.Substring(1, $rawValue.Length - 2)
            continue
        }

        $values[$key] = $rawValue
    }

    return $values
}

function Get-EnvironmentFileValues {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    $values = @{}

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()

        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith('#')) {
            continue
        }

        if ($trimmed -notmatch '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
            throw "Linha invalida no arquivo local de credenciais: $trimmed"
        }

        $key = $Matches[1]
        $value = $Matches[2].Trim()

        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$key] = $value
    }

    return $values
}

$userProfile = $env:USERPROFILE
if ([string]::IsNullOrWhiteSpace($userProfile)) {
    $userProfile = [Environment]::GetFolderPath('UserProfile')
}

if ([string]::IsNullOrWhiteSpace($userProfile)) {
    throw 'Nao foi possivel localizar o perfil do usuario do Windows.'
}

$localEnvironmentPath = Join-Path $PSScriptRoot 'mssql-mcp-write.env'
$codexConfigPath = Join-Path $userProfile '.codex\config.toml'
$connection = @{}

if (Test-Path -LiteralPath $localEnvironmentPath -PathType Leaf) {
    $connection = Get-EnvironmentFileValues -Path $localEnvironmentPath
}
elseif (Test-Path -LiteralPath $codexConfigPath -PathType Leaf) {
    $legacySource = Get-TomlSectionValues `
        -Path $codexConfigPath `
        -Section 'mcp_servers.sqlserver.env'

    if ($legacySource.ContainsKey('SQLSERVER_HOST')) {
        $connection['SERVER_NAME'] = $legacySource['SQLSERVER_HOST']
        $connection['DATABASE_NAME'] = $legacySource['SQLSERVER_DATABASE']
        $connection['SQL_USERNAME'] = $legacySource['SQLSERVER_USER']
        $connection['SQL_PASSWORD'] = $legacySource['SQLSERVER_PASSWORD']
        $connection['SQL_PORT'] = $legacySource['SQLSERVER_PORT']
        $connection['TRUST_SERVER_CERTIFICATE'] = $legacySource['SQLSERVER_TRUST_CERT']
    }
}

$requiredKeys = @('SERVER_NAME', 'DATABASE_NAME', 'SQL_USERNAME')

foreach ($requiredKey in $requiredKeys) {
    if (-not $connection.ContainsKey($requiredKey) -or [string]::IsNullOrWhiteSpace([string] $connection[$requiredKey])) {
        throw "A variavel $requiredKey nao foi encontrada. Crie .codex\mssql-mcp-write.env a partir do arquivo .example."
    }
}

$sqlPassword = $null

if ($connection.ContainsKey('SQL_PASSWORD') -and
    -not [string]::IsNullOrWhiteSpace([string] $connection['SQL_PASSWORD'])) {
    $sqlPassword = [string] $connection['SQL_PASSWORD']
}
elseif ($connection.ContainsKey('SQL_PASSWORD_AES_FILE') -and
        $connection.ContainsKey('SQL_PASSWORD_AES_KEY_FILE') -and
        -not [string]::IsNullOrWhiteSpace([string] $connection['SQL_PASSWORD_AES_FILE']) -and
        -not [string]::IsNullOrWhiteSpace([string] $connection['SQL_PASSWORD_AES_KEY_FILE'])) {
    $credentialPath = [string] $connection['SQL_PASSWORD_AES_FILE']
    $keyPath = [string] $connection['SQL_PASSWORD_AES_KEY_FILE']

    if (-not [System.IO.Path]::IsPathRooted($credentialPath)) {
        $credentialPath = Join-Path $PSScriptRoot $credentialPath
    }

    if (-not [System.IO.Path]::IsPathRooted($keyPath)) {
        $keyPath = Join-Path $PSScriptRoot $keyPath
    }

    if (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
        throw "Credencial cifrada nao encontrada em: $credentialPath"
    }

    if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) {
        throw "Chave da credencial nao encontrada em: $keyPath"
    }

    $encryptionKey = [Convert]::FromBase64String((Get-Content -LiteralPath $keyPath -Raw).Trim())
    $securePassword = Get-Content -LiteralPath $credentialPath -Raw |
        ConvertTo-SecureString -Key $encryptionKey
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

    try {
        $sqlPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        [Array]::Clear($encryptionKey, 0, $encryptionKey.Length)
    }
}
elseif ($connection.ContainsKey('SQL_PASSWORD_DPAPI_FILE') -and
        -not [string]::IsNullOrWhiteSpace([string] $connection['SQL_PASSWORD_DPAPI_FILE'])) {
    $credentialPath = [string] $connection['SQL_PASSWORD_DPAPI_FILE']

    if (-not [System.IO.Path]::IsPathRooted($credentialPath)) {
        $credentialPath = Join-Path $PSScriptRoot $credentialPath
    }

    if (-not (Test-Path -LiteralPath $credentialPath -PathType Leaf)) {
        throw "Credencial protegida nao encontrada em: $credentialPath"
    }

    $securePassword = Get-Content -LiteralPath $credentialPath -Raw | ConvertTo-SecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

    try {
        $sqlPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
}

if ([string]::IsNullOrWhiteSpace($sqlPassword)) {
    throw 'Nenhuma senha SQL foi configurada no arquivo local do MCP de escrita.'
}

if ([string] $connection['DATABASE_NAME'] -cne 'Estrategia') {
    throw 'O MCP de escrita foi bloqueado porque o banco configurado nao e Estrategia.'
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$auditLogPath = Join-Path $projectRoot 'storage\logs\mssql-mcp-write-audit.jsonl'

$env:SERVER_NAME = [string] $connection['SERVER_NAME']
$env:DATABASE_NAME = [string] $connection['DATABASE_NAME']
$env:SQL_AUTH_MODE = 'sql'
$env:SQL_USERNAME = [string] $connection['SQL_USERNAME']
$env:SQL_PASSWORD = $sqlPassword
$env:SQL_PORT = if ($connection.ContainsKey('SQL_PORT') -and $connection['SQL_PORT']) { [string] $connection['SQL_PORT'] } else { '1433' }
$env:TRUST_SERVER_CERTIFICATE = if ($connection.ContainsKey('TRUST_SERVER_CERTIFICATE') -and $connection['TRUST_SERVER_CERTIFICATE']) { [string] $connection['TRUST_SERVER_CERTIFICATE'] } else { 'true' }
$env:READONLY = 'false'
$env:REQUIRE_MUTATION_CONFIRMATION = 'true'
$env:MAX_ROWS_DEFAULT = '1000'
$env:AUDIT_LOGGING = 'true'
$env:AUDIT_REDACT_SENSITIVE = 'true'
$env:AUDIT_LOG_PATH = $auditLogPath

$launcher = Join-Path $env:APPDATA 'npm\mssql-mcp-server.cmd'
if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
    throw "Executavel do MCP nao encontrado em: $launcher"
}

& $launcher
exit $LASTEXITCODE

