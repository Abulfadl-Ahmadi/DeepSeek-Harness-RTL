<#
.SYNOPSIS
  DeepSeek Harness RTL & Vazirmatn Typography Patcher for Windows
  Dedicated to the memory of Saber Rastikerdar (creator of Vazirmatn)
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "DeepSeek Harness RTL & Vazirmatn Setup"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "  DeepSeek Harness RTL & Vazirmatn Font Setup (Persian RTL)  " -ForegroundColor Yellow
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "    Dedicated to the memory of Saber Rastikerdar             " -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Download & Install Vazirmatn Font if not installed
Write-Host "1. Checking Vazirmatn font installation..." -ForegroundColor Yellow
$FontsFolder = "$env:LOCALAPPDATA\Microsoft\Windows\Fonts"
$ExistingVazir = Get-ChildItem -Path $FontsFolder -Filter "*Vazirmatn*.ttf" -ErrorAction SilentlyContinue

if ($ExistingVazir -and $ExistingVazir.Count -gt 0) {
    $count = $ExistingVazir.Count
    Write-Host "✔ Vazirmatn font is already installed: $count font files found." -ForegroundColor Green
} else {
    Write-Host "Downloading latest Vazirmatn font..." -ForegroundColor Cyan
    $ZipUrl = "https://github.com/rastikerdar/vazirmatn/releases/download/v33.003/vazirmatn-v33.003.zip"
    $TempZip = "$env:TEMP\vazirmatn.zip"
    $TempFolder = "$env:TEMP\vazirmatn_extracted"

    try {
        Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing
        if (-not (Test-Path $FontsFolder)) {
            New-Item -Path $FontsFolder -ItemType Directory | Out-Null
        }
        Expand-Archive -Path $TempZip -DestinationPath $TempFolder -Force
        $TtfFiles = Get-ChildItem -Path $TempFolder -Filter "*.ttf" -Recurse

        foreach ($File in $TtfFiles) {
            $TargetFile = Join-Path $FontsFolder $File.Name
            Copy-Item -Path $File.FullName -Destination $TargetFile -Force
            $RegPath = "HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts"
            $FontName = $File.BaseName + " (TrueType)"
            Set-ItemProperty -Path $RegPath -Name $FontName -Value $File.Name | Out-Null
        }
        Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $TempFolder -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✔ Vazirmatn font installed successfully." -ForegroundColor Green
    } catch {
        $errMsg = $_.Exception.Message
        Write-Host "⚠️ Could not download font automatically: $errMsg. Web font CDN fallback will be used." -ForegroundColor Yellow
    }
}

Write-Host ""
# 2. Locate DeepSeek Harness installation
Write-Host "2. Locating DeepSeek Harness installation..." -ForegroundColor Yellow
$DshAsarPath = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\app.asar"
$DshExePath = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe"

if (-not (Test-Path $DshAsarPath)) {
    Write-Host "❌ DeepSeek Harness was not found at standard path: $DshAsarPath" -ForegroundColor Red
    $CustomPath = ""
    try {
        $CustomPath = Read-Host "Please enter the full path to app.asar (or press Enter to cancel)"
    } catch { }
    if ($CustomPath -and (Test-Path $CustomPath)) {
        $DshAsarPath = $CustomPath
        $DshExePath = Join-Path (Split-Path (Split-Path $CustomPath -Parent) -Parent) "DeepSeek Harness.exe"
    } else {
        Write-Host "Aborted." -ForegroundColor Red
        try { Read-Host "Press Enter to exit..." } catch { }
        exit 1
    }
}

Write-Host "✔ Found DeepSeek Harness at: $DshAsarPath" -ForegroundColor Green

# 3. Check if DeepSeek Harness is running
Write-Host ""
Write-Host "3. Checking for running DeepSeek Harness processes..." -ForegroundColor Yellow
$RunningProcesses = Get-Process | Where-Object { $_.ProcessName -like "*DeepSeek Harness*" -or $_.Path -like "*DeepSeek Harness.exe*" }

if ($RunningProcesses) {
    $procCount = $RunningProcesses.Count
    Write-Host "⚠️ DeepSeek Harness is currently running: $procCount active process(es)." -ForegroundColor Yellow
    Write-Host "In order to apply the patch, DeepSeek Harness must be closed." -ForegroundColor Cyan
    $Choice = ""
    try {
        $Choice = Read-Host "Close DeepSeek Harness now to continue? [Y/N]"
    } catch { }

    if ($Choice -eq 'Y' -or $Choice -eq 'y') {
        Write-Host "Closing DeepSeek Harness..." -ForegroundColor Cyan
        $RunningProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Host "✔ DeepSeek Harness stopped." -ForegroundColor Green
    } else {
        Write-Host "Please close DeepSeek Harness manually and run this script again." -ForegroundColor Yellow
        try { Read-Host "Press Enter to exit..." } catch { }
        exit 0
    }
} else {
    Write-Host "✔ DeepSeek Harness is not running. Ready to patch." -ForegroundColor Green
}

# 4. Backup original app.asar
Write-Host ""
Write-Host "4. Creating backup of original app.asar..." -ForegroundColor Yellow
$BackupPath = "$DshAsarPath.bak"
if (-not (Test-Path $BackupPath)) {
    Copy-Item -Path $DshAsarPath -Destination $BackupPath -Force
    Write-Host "✔ Backup created at: $BackupPath" -ForegroundColor Green
} else {
    Write-Host "ℹ️ Existing backup found at: $BackupPath" -ForegroundColor Cyan
}

# 5. Apply the Patch
Write-Host ""
Write-Host "5. Applying RTL & Vazirmatn patch..." -ForegroundColor Yellow
$PrebuiltPatched = "$DshAsarPath.patched"
$PatchScript = Join-Path $PSScriptRoot "patch_dsh.js"

$Applied = $false
if (Test-Path $PrebuiltPatched) {
    try {
        Copy-Item -Path $PrebuiltPatched -Destination $DshAsarPath -Force
        $Applied = $true
        Write-Host "✔ Applied prebuilt patched archive successfully." -ForegroundColor Green
    } catch {
        $copyErr = $_.Exception.Message
        Write-Host "Notice: Could not copy prebuilt file ($copyErr). Building from source..." -ForegroundColor Yellow
    }
}

if (-not $Applied) {
    $NodeCmd = "node"
    if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
        $DshNode = "$env:USERPROFILE\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
        if (Test-Path $DshNode) {
            $NodeCmd = $DshNode
        }
    }

    $TempOutput = "$env:TEMP\app.asar.patched"
    & $NodeCmd "$PatchScript" --path "$DshAsarPath" --output "$TempOutput"
    if ($LASTEXITCODE -eq 0 -and (Test-Path $TempOutput)) {
        Copy-Item -Path $TempOutput -Destination $DshAsarPath -Force
        Remove-Item -Path $TempOutput -Force -ErrorAction SilentlyContinue
        Write-Host "✔ Built and applied patch successfully." -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to build patched archive." -ForegroundColor Red
        try { Read-Host "Press Enter to exit..." } catch { }
        exit 1
    }
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "✔ DeepSeek Harness RTL & Vazirmatn patch applied successfully!" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host ""

if (Test-Path $DshExePath) {
    $Relaunch = ""
    try {
        $Relaunch = Read-Host "Do you want to launch DeepSeek Harness now? [Y/N]"
    } catch { }
    if ($Relaunch -eq 'Y' -or $Relaunch -eq 'y') {
        Start-Process $DshExePath
        Write-Host "DeepSeek Harness launched. Enjoy Persian typography!" -ForegroundColor Green
    }
} else {
    Write-Host "Please start DeepSeek Harness to enjoy Persian typography!" -ForegroundColor Cyan
}

Write-Host ""
try { Read-Host "Press Enter to exit..." } catch { }
