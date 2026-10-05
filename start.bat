@echo off
rem ============================================================================
rem  IdleArc - запуск на Windows.
rem
rem  Двойной клик по этому файлу: поднимается ХАБ "две стороны" (Guide Helper
rem  и Companion в одной оболочке, порт 8080), и приложение открывается
rem  в браузере. Пока окно открыто - приложение работает;
rem  Ctrl+C или закрытие окна - остановка сервера.
rem
rem  Варианты запуска:
rem    start.bat        - хаб "две стороны" (порт 8080, если свободен)
rem    start.bat 8090   - хаб на своём порту
rem    start.bat arc    - только классический Guide Helper (порт 5173)
rem
rem  Важно: команды в этом файле только латиницей (cmd иначе может исказить
rem  текст). Русский текст допустим лишь внутри echo/rem - он идёт на экран.
rem ============================================================================
chcp 65001 >nul
title IdleArc Hub - local server
pushd "%~dp0" >nul

echo.
echo  IdleArc - локальный запуск
echo  -----------------------------------------------
echo  По умолчанию запускается ХАБ (две стороны: Guide Helper + Companion)
echo  на порту 8080.
echo  Варианты:  start.bat 8090  - хаб на своём порту
echo             start.bat arc   - только Guide Helper (порт 5173)
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

rem --- 2. Аргумент: слово arc - только Guide Helper; число - свой порт ---
set "MODE_ARG="
set "PORT_ARG="
if /i "%~1"=="arc" (
  set "MODE_ARG=--arc"
) else if not "%~1"=="" (
  set "PORT_ARG=--port %~1"
)

rem --- 3. Запуск: scripts\serve.mjs сам выберет свободный порт и откроет браузер ---
"%NODE_EXE%" "scripts\serve.mjs" %MODE_ARG% %PORT_ARG%
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
