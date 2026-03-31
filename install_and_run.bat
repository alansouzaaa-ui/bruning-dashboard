@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\Comercial\OneDrive\Desktop\Claude Workspace\projetcts\bruning-dashboard\frontend"
echo Instalando dependencias...
call npm install
echo.
echo Iniciando servidor frontend...
call npm run dev
