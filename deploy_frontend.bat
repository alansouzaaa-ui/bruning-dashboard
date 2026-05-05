@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d "C:\Users\Comercial\OneDrive\Desktop\Claude Workspace\projetcts\bruning-dashboard\frontend"
echo Fazendo build e deploy no Vercel...
vercel --prod --yes --env VITE_API_URL=https://bruning-dashboard-production.up.railway.app
