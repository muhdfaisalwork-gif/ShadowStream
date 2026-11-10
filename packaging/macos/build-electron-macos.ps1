<#
.SYNOPSIS
    Builds ShadowStream macOS Desktop Application (DMG and ZIP) from Windows
    via electron-builder multi-target packaging.
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDir = Join-Path (Split-Path -Parent $scriptDir) "windows\app"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " ShadowStream macOS Desktop Application Builder" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Set-Location $appDir

if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "[*] Packaging macOS DMG and ZIP distributions..." -ForegroundColor Yellow
npx electron-builder --mac dmg zip

Write-Host "==================================================" -ForegroundColor Green
Write-Host " macOS builds completed! Artifacts in: $appDir\dist-v2447" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
