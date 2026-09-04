# Remove the Windows logon shortcut created by install-autostart.ps1.
#
#   npm run autostart:uninstall

$ErrorActionPreference = "Stop"

$startupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$shortcutPath = Join-Path $startupDir "RSU Pageant Scoring.lnk"

if (Test-Path $shortcutPath) {
  Remove-Item -Force $shortcutPath
  Write-Host "Removed $shortcutPath" -ForegroundColor Green
} else {
  Write-Host "No autostart shortcut found." -ForegroundColor Yellow
}
