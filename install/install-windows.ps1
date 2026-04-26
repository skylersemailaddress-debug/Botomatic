$ErrorActionPreference = "Stop"

$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LauncherPath = Join-Path $RootDir "install\botomatic-launch.cmd"
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Botomatic.lnk"

if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue) -or -not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Node, npm, and Git are required."
}

Set-Location $RootDir
npm install

@"
@echo off
cd /d "$RootDir"
npm run start:easy
"@ | Set-Content -Path $LauncherPath -Encoding ASCII

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($DesktopShortcut)
$Shortcut.TargetPath = $LauncherPath
$Shortcut.WorkingDirectory = $RootDir
$Shortcut.Save()

Start-Process "http://localhost:3000"
Write-Host "Botomatic launcher created at $LauncherPath"
Write-Host "Desktop shortcut created at $DesktopShortcut"