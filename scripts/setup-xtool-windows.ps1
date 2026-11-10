<#
.SYNOPSIS
    Automated Windows installer for xtool (https://github.com/xtool-org/xtool.git)
    Configures WSL2, Swift 6 toolchain, and prepares ShadowStream iOS/macOS build toolchain.
#>

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ShadowStream: xtool iOS & Mac Cross-Compiler Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check WSL
Write-Host "[1/3] Checking WSL2 status..." -ForegroundColor Yellow
$wslCheck = wsl --status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] WSL is not currently enabled. Installing default WSL distribution..." -ForegroundColor Red
    wsl --install
    Write-Host "[*] Please reboot Windows to complete WSL installation, then re-run this script." -ForegroundColor Green
    exit 0
}

Write-Host "[✓] WSL2 is active." -ForegroundColor Green

# Path translation to WSL
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$wslScriptPath = ($scriptDir.Replace("\", "/").Replace("G:", "/mnt/g").Replace("g:", "/mnt/g").Replace("C:", "/mnt/c").Replace("c:", "/mnt/c")) + "/setup-xtool-wsl.sh"

Write-Host "[2/3] Executing toolchain setup inside WSL..." -ForegroundColor Yellow
Write-Host "Target script: $wslScriptPath" -ForegroundColor DarkGray

wsl bash $wslScriptPath

Write-Host ""
Write-Host "[3/3] Ready to build!" -ForegroundColor Green
Write-Host "To build the iOS app (.ipa), open WSL and run:" -ForegroundColor Cyan
Write-Host "  cd /mnt/g/streaming\ app/packaging/ios/ShadowStream-xtool" -ForegroundColor White
Write-Host "  bash build-xtool-ios.sh" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
