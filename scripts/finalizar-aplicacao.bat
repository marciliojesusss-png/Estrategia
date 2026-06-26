@echo off
setlocal

echo Encerrando servidor local da aplicacao, se estiver em execucao...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$processes = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -match 'json-db-server\.js' });" ^
  "if (-not $processes.Count) { Write-Host 'Nenhum servidor JSON da aplicacao foi encontrado.'; exit 0 }" ^
  "foreach ($process in $processes) { Stop-Process -Id $process.ProcessId -Force; Write-Host ('Processo encerrado: ' + $process.ProcessId) }"

endlocal
