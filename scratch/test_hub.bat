@echo off
set ELECTRON_ENABLE_LOGGING=1
"release\win-unpacked\Dayumi Hub.exe"
echo EXIT_CODE=%ERRORLEVEL%
