@echo off
chcp 65001 >nul
title DeepSeek Harness RTL & Vazirmatn Setup
echo Starting DeepSeek Harness RTL Setup...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_vazirmatn_dsh.ps1"
pause
