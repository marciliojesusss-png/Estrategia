param([Parameter(Mandatory=$true)][string]$BaseUrl)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')
$checks = @('/', '/login', '/api/resumo-executivo')
foreach ($path in $checks) {
    try {
        $response = Invoke-WebRequest -Uri ($base + $path) -UseBasicParsing -MaximumRedirection 0
    } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(302,401,403)) { continue }
        throw
    }
    if ($response.StatusCode -notin @(200,302,401,403)) { throw "Resposta inesperada em ${path}: $($response.StatusCode)" }
    if (!$response.Headers['X-Content-Type-Options']) { throw "Cabecalho de seguranca ausente em $path" }
    Write-Host "OK $path ($($response.StatusCode))"
}
