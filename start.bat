@echo off
rem ============================================================================
rem  IdleArc Guide Helper - запуск на Windows.
rem
rem  Двойной клик по этому файлу: поднимается локальный сервер, и приложение
rem  открывается в браузере. Пока окно открыто - приложение работает;
rem  Ctrl+C или закрытие окна - остановка сервера.
rem
rem  Необязательный аргумент - номер порта, например:  start.bat 8080
rem
rem  Важно: команды в этом файле только латиницей (cmd иначе может исказить
rem  текст). Русский текст допустим лишь внутри echo - он идёт на экран.
rem ============================================================================
chcp 65001 >nul
title IdleArc Guide Helper - local server
pushd "%~dp0" >nul

echo.
echo  IdleArc Guide Helper - локальный запуск
echo  -----------------------------------------------
echo.

rem --- 1. Ищем Node.js: сначала в PATH, потом в стандартной папке установки ---
set "NODE_EXE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
  ) else (
    goto :no_node
  )
)

rem Node проверяем запуском: в Windows бывает заглушка из Microsoft Store,
rem которая на "node -v" ничего не отвечает.
"%NODE_EXE%" -v >nul 2>nul
if errorlevel 1 goto :no_node

rem --- 2. Запуск: scripts\serve.mjs сам выберет свободный порт и откроет браузер ---
set "PORT_ARG="
if not "%~1"=="" set "PORT_ARG=--port %~1"

"%NODE_EXE%" "scripts\serve.mjs" %PORT_ARG%
set "CODE=%ERRORLEVEL%"

if "%CODE%"=="0" goto :ok
if "%CODE%"=="2" goto :old_node

echo.
echo  [!] Запуск не удался. Код ошибки: %CODE%. Подробности - выше в этом окне.
echo      Проверьте, что установлен Node.js 18 или новее: https://nodejs.org/ru/download
echo.
pause
popd >nul
exit /b %CODE%

:old_node
echo.
echo  [!] Установлена устаревшая версия Node.js. Нужна версия 18 или новее.
echo      Скачайте свежую LTS-версию: https://nodejs.org/ru/download
echo.
echo  Открыть страницу загрузки Node.js сейчас? [Y/N]
choice /c YN /n /m "> "
if errorlevel 2 goto :old_done
start "" "https://nodejs.org/ru/download"
:old_done
echo.
echo  После установки запустите этот файл ещё раз.
echo.
pause
popd >nul
exit /b 2

:no_node
echo  [!] Node.js не найден.
echo      Этому приложению нужен Node.js 18 или новее: он запускает локальный сервер,
echo      который открывает сайт в браузере. Само приложение ставить никуда не нужно.
echo.
echo  Открыть страницу загрузки Node.js сейчас? [Y/N]
choice /c YN /n /m "> "
if errorlevel 2 goto :no_node_done
start "" "https://nodejs.org/ru/download"
:no_node_done
echo.
echo  После установки Node.js запустите этот файл ещё раз.
echo.
pause
popd >nul
exit /b 2

:ok
popd >nul
exit /b 0
