@echo off
setlocal

chcp 65001 >nul

if defined PHP_EXE (
  set "PHP_CMD=%PHP_EXE%"
) else (
  set "PHP_CMD="
  where php >nul 2>nul
  if not errorlevel 1 set "PHP_CMD=php"
  if not defined PHP_CMD if exist "C:\php\php.exe" set "PHP_CMD=C:\php\php.exe"
  if not defined PHP_CMD for /d %%D in ("C:\Sistemas\toolsphp*\php*") do if exist "%%~fD\php.exe" set "PHP_CMD=%%~fD\php.exe"
  if not defined PHP_CMD for /d %%D in ("C:\Sistemas\php*") do if exist "%%~fD\php.exe" set "PHP_CMD=%%~fD\php.exe"
  if not defined PHP_CMD for /d %%D in ("C:\tools\php*") do if exist "%%~fD\php.exe" set "PHP_CMD=%%~fD\php.exe"
  if not defined PHP_CMD for /d %%D in ("C:\Program Files\PHP\*") do if exist "%%~fD\php.exe" set "PHP_CMD=%%~fD\php.exe"
  if not defined PHP_CMD for /d %%D in ("C:\Program Files (x86)\PHP\*") do if exist "%%~fD\php.exe" set "PHP_CMD=%%~fD\php.exe"
)

if not defined PHP_CMD (
  echo php.exe nao encontrado. Configure PHP_EXE com o caminho completo do PHP do servidor.
  exit /b 1
)

pushd "%~dp0..\.." >nul 2>&1
if errorlevel 1 (
  echo Nao foi possivel acessar a pasta da aplicacao: "%~dp0..\.."
  exit /b 1
)

echo Executavel PHP: %PHP_CMD%
"%PHP_CMD%" "scripts\diagnostico-sqlserver.php" %*
set "EXITCODE=%ERRORLEVEL%"

popd >nul 2>&1
exit /b %EXITCODE%
