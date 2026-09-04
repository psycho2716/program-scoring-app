# Register the pageant app to start when this Windows user logs in.
# Does not require Administrator (uses the Startup folder).
#
#   npm run autostart:install
#   .\scripts\install-autostart.ps1
#
# Remove:
#   npm run autostart:uninstall

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$cmdPath = Join-Path $PSScriptRoot "start-pageant.cmd"
$startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = Join-Path $startupDir "RSU Pageant Scoring.lnk"

if (-not (Test-Path $cmdPath)) {
  throw "Missing $cmdPath"
}

New-Item -ItemType Directory -Force -Path $startupDir | Out-Null

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $cmdPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 1
$shortcut.Description = "Start Mr. and Miss Katimugan scoring (frontend + backend)"
$shortcut.Save()

Write-Host ""
Write-Host "Autostart installed for this Windows user." -ForegroundColor Green
Write-Host "Shortcut: $shortcutPath"
Write-Host "At logon it waits for WAMP MySQL, then starts npm run dev."
Write-Host ""
Write-Host "To start now:  npm run servers:start" -ForegroundColor Yellow
Write-Host "To remove:     npm run autostart:uninstall"
Write-Host ""
