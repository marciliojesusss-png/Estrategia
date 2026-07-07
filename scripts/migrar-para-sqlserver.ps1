param(
    [ValidateSet("homologacao", "producao")]
    [string]$Ambiente = "homologacao",

    [string]$Servidor = $env:SQLSERVER_HOST,
    [string]$Banco = $env:SQLSERVER_DATABASE,
    [string]$Driver = $env:SQLSERVER_DRIVER,
    [string]$Encrypt = $env:SQLSERVER_ENCRYPT,
    [string]$TrustServerCertificate = $env:SQLSERVER_TRUST_SERVER_CERTIFICATE,
    [string]$Sqlite = ".\database\indicadores.sqlite",

    [switch]$SchemaOnly,
    [switch]$Truncate,
    [switch]$SeedAuthUsers,
    [switch]$SyncAuthUsers,
    [switch]$GerarSqlAuthUsers,
    [switch]$SkipBackup,
    [switch]$Yes
)

$ErrorActionPreference = "Stop"
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $Utf8NoBom
$OutputEncoding = $Utf8NoBom

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "OK  $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "AVISO  $Message" -ForegroundColor Yellow
}

function Confirm-Step {
    param([string]$Message)
    if ($Yes) {
        return
    }
    $answer = Read-Host "$Message Digite SIM para continuar"
    if ($answer -ne "SIM") {
        throw "Operacao cancelada pelo usuario."
    }
}

function Resolve-Python {
    $commands = @("python", "py")
    foreach ($command in $commands) {
        $found = Get-Command $command -ErrorAction SilentlyContinue
        if ($found) {
            return $command
        }
    }
    throw "Python nao encontrado no PATH."
}

function Test-PythonModule {
    param(
        [string]$Python,
        [string]$Module
    )
    & $Python -c "import $Module" | Out-Null
}

function Set-EnvDefault {
    param(
        [string]$Name,
        [string]$Value
    )
    if ($Value -ne "") {
        Set-Item -Path "env:$Name" -Value $Value
    }
}

function Invoke-NativeCommand {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = & $Command @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    return [PSCustomObject]@{
        ExitCode = $exitCode
        Output = $output
        Text = ($output -join [Environment]::NewLine)
    }
}

function Write-VerificationAlerts {
    $reportPath = ".\database\sqlserver\migration-report.json"
    if (-not (Test-Path -LiteralPath $reportPath)) {
        return
    }

    try {
        $report = Get-Content -Raw -LiteralPath $reportPath | ConvertFrom-Json
    } catch {
        return
    }

    if ($report.checks.json) {
        foreach ($table in $report.checks.json.PSObject.Properties) {
            if ($table.Value.passed) {
                continue
            }
            foreach ($errorItem in $table.Value.errors) {
                Write-Warn "JSON invalido em $($table.Name).$($errorItem.column), id=$($errorItem.id): $($errorItem.error)"
            }
        }
    }
}

if (-not $Servidor) { $Servidor = "localhost" }
if (-not $Banco) { $Banco = "Estrategia" }
if (-not $Driver) { $Driver = "ODBC Driver 18 for SQL Server" }
if (-not $Encrypt) { $Encrypt = "yes" }
if (-not $TrustServerCertificate) {
    if ($Ambiente -eq "homologacao") {
        $TrustServerCertificate = "yes"
    } else {
        $TrustServerCertificate = "no"
    }
}

Set-EnvDefault -Name "SQLSERVER_HOST" -Value $Servidor
Set-EnvDefault -Name "SQLSERVER_DATABASE" -Value $Banco
Set-EnvDefault -Name "SQLSERVER_DRIVER" -Value $Driver
Set-EnvDefault -Name "SQLSERVER_ENCRYPT" -Value $Encrypt
Set-EnvDefault -Name "SQLSERVER_TRUST_SERVER_CERTIFICATE" -Value $TrustServerCertificate

Write-Host "Migracao SQLite -> SQL Server" -ForegroundColor White
Write-Host "Ambiente: $Ambiente"
Write-Host "Servidor SQL Server: $Servidor"
Write-Host "Banco SQL Server: $Banco"
Write-Host "Driver ODBC: $Driver"
Write-Host "Encrypt: $Encrypt"
Write-Host "TrustServerCertificate: $TrustServerCertificate"
Write-Host "SQLite origem: $Sqlite"

if ($Ambiente -eq "producao") {
    if ($Truncate) {
        throw "Por seguranca, este orquestrador nao permite -Truncate em producao."
    }
    if ($SeedAuthUsers) {
        throw "Por seguranca, este orquestrador nao permite -SeedAuthUsers em producao."
    }
    if ($TrustServerCertificate -match "^(?i:yes|true|1)$") {
        Write-Warn "TrustServerCertificate=$TrustServerCertificate desativa a validacao da cadeia do certificado TLS."
        Confirm-Step "Voce esta prestes a executar migracao em PRODUCAO sem validar o certificado do SQL Server."
    }
    Confirm-Step "Voce esta prestes a executar migracao em PRODUCAO."
}

if ($Truncate) {
    Confirm-Step "A opcao -Truncate apaga dados das tabelas de destino antes da carga."
}

Write-Step "Validando arquivos e dependencias"
if (-not (Test-Path -LiteralPath $Sqlite)) {
    throw "SQLite nao encontrado: $Sqlite"
}
if (-not (Test-Path -LiteralPath ".\scripts\migrar-sqlite-para-sqlserver.py")) {
    throw "Script de migracao nao encontrado."
}
if (-not (Test-Path -LiteralPath ".\scripts\verificar-sqlserver.py")) {
    throw "Script de verificacao nao encontrado."
}

$python = Resolve-Python
Write-Ok "Python encontrado: $python"

try {
    Test-PythonModule -Python $python -Module "pyodbc"
    Write-Ok "Modulo Python pyodbc encontrado"
} catch {
    throw "Modulo pyodbc ausente. Instale com: python -m pip install pyodbc"
}

if (-not $SkipBackup -and -not $SchemaOnly) {
    Write-Step "Criando backup do SQLite"
    $backupDir = ".\database\backups"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = Join-Path $backupDir "indicadores-antes-sqlserver-$timestamp.sqlite"
    Copy-Item -LiteralPath $Sqlite -Destination $backupPath
    Write-Ok "Backup criado: $backupPath"
}

Write-Step "Executando migracao"
$migrationArgs = @(".\scripts\migrar-sqlite-para-sqlserver.py", "--sqlite", $Sqlite)
if ($SchemaOnly) { $migrationArgs += "--schema-only" }
if ($Truncate) { $migrationArgs += "--truncate" }
if ($SeedAuthUsers) { $migrationArgs += "--seed-auth-users" }

$migrationResult = Invoke-NativeCommand -Command $python -Arguments $migrationArgs
$migrationText = $migrationResult.Text
if ($migrationText) {
    Write-Host $migrationText
}
if ($migrationResult.ExitCode -ne 0) {
    if ($migrationText -match "cadeia de certifica|authority that is not trusted|certificate chain|SSL Provider") {
        Write-Host ""
        Write-Warn "Falha de certificado TLS na conexao com o SQL Server."
        Write-Host "O driver ODBC esta com Encrypt=$Encrypt e TrustServerCertificate=$TrustServerCertificate."
        Write-Host ""
        if ($Ambiente -eq "homologacao") {
            Write-Host "Para homologacao/local, voce pode repetir usando:"
            Write-Host ".\migrar-para-sqlserver.bat -Ambiente homologacao -TrustServerCertificate yes"
            Write-Host ""
        } else {
            Write-Host "Se isto for um teste local, execute como homologacao:"
            Write-Host ".\migrar-para-sqlserver.bat -Ambiente homologacao -TrustServerCertificate yes"
            Write-Host ""
        }
        Write-Host "Para producao, o recomendado e instalar/confiar no certificado do SQL Server na maquina da aplicacao e manter:"
        Write-Host "Encrypt=yes"
        Write-Host "TrustServerCertificate=no"
        Write-Host ""
    }
    throw "Migracao falhou com codigo $($migrationResult.ExitCode)."
}
Write-Ok "Migracao concluida"

if ($SyncAuthUsers) {
    Write-Step "Sincronizando usuarios_acesso para SQL Server"
    $syncArgs = @(".\scripts\sincronizar-usuarios-acesso-sqlserver.py", "--sqlite", $Sqlite)
    $syncResult = Invoke-NativeCommand -Command $python -Arguments $syncArgs
    if ($syncResult.Text) {
        Write-Host $syncResult.Text
    }
    if ($syncResult.ExitCode -ne 0) {
        throw "Sincronizacao de usuarios_acesso falhou com codigo $($syncResult.ExitCode)."
    }
    Write-Ok "usuarios_acesso sincronizado"
}

if ($GerarSqlAuthUsers) {
    Write-Step "Gerando SQL de usuarios_acesso para execucao manual no SSMS"
    $authSqlArgs = @(".\scripts\gerar-sql-usuarios-acesso.py", "--sqlite", $Sqlite, "--database", $Banco)
    $authSqlResult = Invoke-NativeCommand -Command $python -Arguments $authSqlArgs
    if ($authSqlResult.Text) {
        Write-Host $authSqlResult.Text
    }
    if ($authSqlResult.ExitCode -ne 0) {
        throw "Geracao do SQL de usuarios_acesso falhou com codigo $($authSqlResult.ExitCode)."
    }
    Write-Ok "SQL gerado em database\sqlserver\sincronizar-usuarios-acesso.sql"
}

if (-not $SchemaOnly) {
    Write-Step "Verificando migracao"
    $verifyArgs = @(".\scripts\verificar-sqlserver.py", "--sqlite", $Sqlite)
    $verifyResult = Invoke-NativeCommand -Command $python -Arguments $verifyArgs
    $verifyText = $verifyResult.Text
    if ($verifyText) {
        Write-Host $verifyText
    }
    if ($verifyResult.ExitCode -ne 0) {
        if ($verifyText -match "cadeia de certifica|authority that is not trusted|certificate chain|SSL Provider") {
            Write-Host ""
            Write-Warn "Falha de certificado TLS na verificacao do SQL Server."
            Write-Host "Para homologacao/local, repita usando:"
            Write-Host ".\migrar-para-sqlserver.bat -Ambiente homologacao -TrustServerCertificate yes"
            Write-Host ""
        }
        Write-VerificationAlerts
        throw "Verificacao encontrou alertas. Consulte database\sqlserver\migration-report.json."
    }
    Write-Ok "Verificacao concluida sem alertas"
}

Write-Step "Proximos passos"
Write-Host "1. Configure a aplicacao no servidor com DB_CONNECTION=sqlsrv e APP_ENV=production."
Write-Host "2. Configure LDAP_PATH para o LDAP corporativo."
Write-Host "3. Cadastre ou revise os usuarios em dbo.usuarios_acesso."
Write-Host "4. Teste login, lancamentos, homologacao, relatorios e administracao."
Write-Host ""
Write-Ok "Processo finalizado."
