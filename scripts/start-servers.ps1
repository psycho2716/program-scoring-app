# Start WAMP MySQL (if needed), then backend + frontend.
# Used by Windows Startup / Task Scheduler.
#
#   npm run servers:start
#   .\scripts\start-servers.ps1

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$logDir = Join-Path $projectRoot "logs"
$logFile = Join-Path $logDir "autostart.log"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-Log([string]$message) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
  Add-Content -Path $logFile -Value $line
  Write-Host $line
}

function Test-PortListening([int]$port) {
  return [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

function Wait-Port([int]$port, [int]$seconds) {
  for ($i = 0; $i -lt $seconds; $i++) {
    if (Test-PortListening $port) { return $true }
    Start-Sleep -Seconds 1
  }
  return $false
}

# Scheduled tasks often have a thin PATH. Merge Machine + User.
$env:Path = @(
  [Environment]::GetEnvironmentVariable("Path", "Machine")
  [Environment]::GetEnvironmentVariable("Path", "User")
) -join ";"

Write-Log "Starting pageant servers from $projectRoot"

if ((Test-PortListening 3000) -and (Test-PortListening 4000)) {
  Write-Log "Frontend (3000) and backend (4000) already listening. Nothing to do."
  exit 0
}

if (-not (Test-PortListening 3306)) {
  Write-Log "MySQL is not listening on 3306. Starting WAMP database services..."
  foreach ($name in @("wampmysqld64", "wampmariadb64")) {
    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -ne "Running") {
      try {
        Start-Service -Name $name
        Write-Log "Started service $name"
      } catch {
        Write-Log "Could not start ${name}: $($_.Exception.Message)"
      }
    }
  }

  if (-not (Wait-Port 3306 90)) {
    Write-Log "ERROR: MySQL did not start on port 3306. Open WAMP and start MySQL, then run npm run dev."
    exit 1
  }
  Write-Log "MySQL is ready on 3306."
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  Write-Log "ERROR: npm was not found on PATH. Install Node.js and reboot, then try again."
  exit 1
}

$cmd = "title RSU Pageant Scoring && cd /d `"$projectRoot`" && npm run dev"
Start-Process -FilePath "cmd.exe" -WorkingDirectory $projectRoot -ArgumentList @("/k", $cmd)
Write-Log "Launched npm run dev in a Command Prompt window."
Write-Log "Frontend http://localhost:3000  Backend http://localhost:4000"
