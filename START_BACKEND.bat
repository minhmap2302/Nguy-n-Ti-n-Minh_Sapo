@echo off
cd /d "%~dp0backend"
call gradlew.bat --stop
call gradlew.bat clean bootRun
pause
