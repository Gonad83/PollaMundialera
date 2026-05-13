@echo off
echo Arrancando Mundial 2026...

start "Backend Mundial2026" cmd /k "cd /d "C:\Users\ASUS\Desktop\Proyectos Vibe Coding\Mundial2026\mundial2026-backend" && npm run dev"

timeout /t 3 /nobreak > nul

start "Frontend Mundial2026" cmd /k "cd /d "C:\Users\ASUS\Desktop\Proyectos Vibe Coding\Mundial2026\mundial2026-frontend" && npm run dev"

timeout /t 5 /nobreak > nul

start http://localhost:5173
