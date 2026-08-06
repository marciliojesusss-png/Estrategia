@echo off
setlocal

chcp 65001 >nul

pushd "%~dp0..\.." >nul 2>&1
if errorlevel 1 (
  echo Nao foi possivel acessar a pasta da aplicacao: "%~dp0..\.."
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\servidor.ps1" reiniciar -Background -OpenBrowser %*
set "EXITCODE=%ERRORLEVEL%"

popd >nul 2>&1
exit /b %EXITCODE%
