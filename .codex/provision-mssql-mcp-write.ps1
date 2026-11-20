param(
    [string] $ServerInstance = 'localhost\SQLEXPRESS01',
    [string] $DatabaseName = 'Estrategia',
    [string] $LoginName = 'mcp_estrategia_codex',
    [string] $RoleName = 'mcp_estrategia_codex_role',
    [string] $CredentialPath = (Join-Path $PSScriptRoot 'mssql-mcp-write.credential'),
    [string] $KeyPath = (Join-Path $PSScriptRoot 'mssql-mcp-write.key')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($DatabaseName -cne 'Estrategia') {
    throw 'O provisionamento foi bloqueado porque o banco informado nao e Estrategia.'
}

foreach ($identifier in @($DatabaseName, $LoginName, $RoleName)) {
    if ($identifier -notmatch '^[A-Za-z0-9_]+$') {
        throw "Identificador SQL invalido: $identifier"
    }
}

$randomBytes = New-Object byte[] 32
$randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()

try {
    $randomGenerator.GetBytes($randomBytes)
}
finally {
    $randomGenerator.Dispose()
}

$randomToken = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', 'K').Replace('/', 'x')
$plainPassword = "Aa1!$randomToken"
$escapedPassword = $plainPassword.Replace("'", "''")
$encryptionKey = $null

$query = @"
USE [master];

IF DB_ID(N'$DatabaseName') IS NULL
    THROW 51000, 'Banco Estrategia nao encontrado.', 1;

IF SUSER_ID(N'$LoginName') IS NULL
BEGIN
    CREATE LOGIN [$LoginName]
        WITH PASSWORD = N'$escapedPassword',
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF,
             DEFAULT_DATABASE = [$DatabaseName];
END
ELSE
BEGIN
    ALTER LOGIN [$LoginName]
        WITH PASSWORD = N'$escapedPassword',
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF,
             DEFAULT_DATABASE = [$DatabaseName];
END;

ALTER LOGIN [$LoginName] ENABLE;
DENY VIEW ANY DATABASE TO [$LoginName];

USE [$DatabaseName];

IF USER_ID(N'$LoginName') IS NULL
    CREATE USER [$LoginName] FOR LOGIN [$LoginName];
ELSE
    ALTER USER [$LoginName] WITH LOGIN = [$LoginName];

IF DATABASE_PRINCIPAL_ID(N'$RoleName') IS NULL
    CREATE ROLE [$RoleName] AUTHORIZATION [dbo];

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members AS drm
    INNER JOIN sys.database_principals AS role_principal
        ON role_principal.principal_id = drm.role_principal_id
    INNER JOIN sys.database_principals AS member_principal
        ON member_principal.principal_id = drm.member_principal_id
    WHERE role_principal.name = N'$RoleName'
      AND member_principal.name = N'$LoginName'
)
    ALTER ROLE [$RoleName] ADD MEMBER [$LoginName];

GRANT CONNECT TO [$LoginName];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[dbo] TO [$RoleName];

DENY ALTER ON SCHEMA::[dbo] TO [$LoginName];
REVOKE CONTROL ON SCHEMA::[dbo] TO [$LoginName];
DENY CREATE TABLE TO [$LoginName];
DENY CREATE VIEW TO [$LoginName];
DENY CREATE PROCEDURE TO [$LoginName];
DENY CREATE FUNCTION TO [$LoginName];
DENY TAKE OWNERSHIP TO [$LoginName];
"@

try {
    Invoke-Sqlcmd `
        -ServerInstance $ServerInstance `
        -Database 'master' `
        -Query $query `
        -AbortOnError `
        -ErrorAction Stop | Out-Null

    $encryptionKey = New-Object byte[] 32
    $encryptionKeyGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()

    try {
        $encryptionKeyGenerator.GetBytes($encryptionKey)
    }
    finally {
        $encryptionKeyGenerator.Dispose()
    }

    $securePassword = ConvertTo-SecureString $plainPassword -AsPlainText -Force
    $encryptedPassword = ConvertFrom-SecureString $securePassword -Key $encryptionKey
    $encodedKey = [Convert]::ToBase64String($encryptionKey)
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText($CredentialPath, $encryptedPassword, $utf8WithoutBom)
    [IO.File]::WriteAllText($KeyPath, $encodedKey, $utf8WithoutBom)

}
finally {
    $plainPassword = $null
    $escapedPassword = $null
    [Array]::Clear($randomBytes, 0, $randomBytes.Length)

    if ($null -ne $encryptionKey) {
        [Array]::Clear($encryptionKey, 0, $encryptionKey.Length)
    }
}

Write-Output "Login criado/atualizado: $LoginName"
Write-Output "Banco autorizado: $DatabaseName"
Write-Output "Funcao de banco: $RoleName"
Write-Output "Credencial cifrada gravada em arquivos locais ignorados pelo Git."

