<#
.SYNOPSIS
  DeepSeek Harness RTL & Vazirmatn Restore Script
  Restores original app.asar from backup
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Restore Original DeepSeek Harness"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "     Restore DeepSeek Harness to Original State              " -ForegroundColor Yellow
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

$DshAsarPath = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\app.asar"
$BackupPath = "$DshAsarPath.bak"

if (-not (Test-Path $BackupPath)) {
    Write-Host "❌ No backup file found at: $BackupPath" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}

$RunningProcesses = Get-Process | Where-Object { $_.ProcessName -like "*DeepSeek Harness*" -or $_.Path -like "*DeepSeek Harness.exe*" }
if ($RunningProcesses) {
    Write-Host "⚠️ DeepSeek Harness is running. Closing to restore backup..." -ForegroundColor Yellow
    $RunningProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

try {
    Copy-Item -Path $BackupPath -Destination $DshAsarPath -Force
    Write-Host "✔ Successfully restored original app.asar from backup." -ForegroundColor Green
} catch {
    Write-Host "❌ Error restoring backup: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Read-Host "Press Enter to exit..."
