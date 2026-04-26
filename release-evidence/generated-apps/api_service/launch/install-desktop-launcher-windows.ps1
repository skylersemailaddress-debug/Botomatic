$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Launcher = Join-Path $RootDir "launch\launch-local.ps1"
$DesktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "Botomatic Launch.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($DesktopShortcut)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File \"$Launcher\""
$Shortcut.WorkingDirectory = $RootDir
$Shortcut.Save()
