@echo off
setlocal

chcp 65001 >nul

if defined PHP_EXE (
  set "PHP_CMD=%PHP_EXE%"
) else (
  set "PHP_CMD=php"
)

pushd "%~dp0..\.." >nul 2>&1
if errorlevel 1 (
  echo Nao foi possivel acessar a pasta da aplicacao: "%~dp0..\.."
  exit /b 1
)

echo Executavel PHP: %PHP_CMD%
"%PHP_CMD%" "scripts\preflight-servidor.php" %*
set "EXITCODE=%ERRORLEVEL%"

popd >nul 2>&1
exit /b %EXITCODE%
