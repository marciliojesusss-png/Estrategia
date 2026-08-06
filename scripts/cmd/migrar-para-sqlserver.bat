@echo off
setlocal

chcp 65001 >nul

pushd "%~dp0..\.." >nul 2>&1
if errorlevel 1 (
  echo Nao foi possivel acessar a pasta da aplicacao: "%~dp0..\.."
  exit /b 1
)

python "scripts\migrar-para-sqlserver.py" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="9009" (
  popd >nul 2>&1
  exit /b %EXITCODE%
)

py "scripts\migrar-para-sqlserver.py" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="9009" (
  popd >nul 2>&1
  exit /b %EXITCODE%
)

echo Python nao encontrado no PATH.
popd >nul 2>&1
exit /b 1
