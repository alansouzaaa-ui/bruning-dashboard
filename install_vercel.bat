@echo off
set PATH=C:\Program Files\nodejs;%PATH%
echo Instalando Vercel CLI...
npm install -g vercel
echo.
echo Vercel CLI instalado! Versao:
vercel --version
