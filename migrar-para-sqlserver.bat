@echo off
setlocal

chcp 65001 >nul

python "%~dp0scripts\migrar-para-sqlserver.py" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="9009" exit /b %EXITCODE%

py "%~dp0scripts\migrar-para-sqlserver.py" %*
set EXITCODE=%ERRORLEVEL%
if not "%EXITCODE%"=="9009" exit /b %EXITCODE%

echo Python nao encontrado no PATH.
exit /b 1
