# Point pageant-system.local at the scoring PC. Run as Administrator on other Windows devices.
#
#   .\scripts\add-pageant-hosts.ps1 -ServerIp 192.168.0.159

param(
  [Parameter(Mandatory = $true)]
  [string]$ServerIp
)

$ErrorActionPreference = "Stop"
$HostName = "pageant-system.local"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  Write-Host "ERROR: Run PowerShell as Administrator." -ForegroundColor Red
  exit 1
}

if ($ServerIp -notmatch '^(10\.|192\.168\.)') {
  throw "ServerIp should be the scoring PC Wi-Fi IPv4 (10.x or 192.168.x). Got: $ServerIp"
}

$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$lines = [IO.File]::ReadAllLines($hostsPath)
$kept = foreach ($line in $lines) {
  if ($line -match '(?i)\s+pageant-system\.local\s*$') { continue }
  $line
}
$kept = @($kept) + @("$ServerIp $HostName")
[IO.File]::WriteAllLines($hostsPath, $kept)

Write-Host "Hosts updated: $ServerIp $HostName" -ForegroundColor Green
Write-Host "Open http://$HostName"
