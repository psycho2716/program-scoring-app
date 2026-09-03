# Allow inbound TCP on ports 3000 (frontend) and 4000 (backend) for LAN judge tablets.
# Must run elevated (Administrator).
#
# Preferred:
#   npm run lan:firewall
#
# Or manually in an elevated PowerShell:
#   cd <project-root>
#   .\scripts\open-lan-firewall.ps1

$ErrorActionPreference = "Stop"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  $projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
  Write-Host ""
  Write-Host "ERROR: This script must run as Administrator." -ForegroundColor Red
  Write-Host "Right-click PowerShell -> Run as administrator, then:" -ForegroundColor Yellow
  Write-Host "  cd `"$projectRoot`"" -ForegroundColor Yellow
  Write-Host "  npm run lan:firewall" -ForegroundColor Yellow
  Write-Host "or:" -ForegroundColor Yellow
  Write-Host "  .\scripts\open-lan-firewall.ps1" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

# Include Public: many home/office Wi-Fi networks are classified as Public.
$profiles = @("Domain", "Private", "Public")

$rules = @(
  @{
    Name = "RSU-Scoring-Frontend-3000"
    DisplayName = "RSU Scoring Frontend (TCP 3000)"
    Port = 3000
  },
  @{
    Name = "RSU-Scoring-Backend-4000"
    DisplayName = "RSU Scoring Backend (TCP 4000)"
    Port = 4000
  }
)

foreach ($rule in $rules) {
  $existing = Get-NetFirewallRule -Name $rule.Name -ErrorAction SilentlyContinue
  if (-not $existing) {
    $existing = Get-NetFirewallRule -DisplayName $rule.DisplayName -ErrorAction SilentlyContinue
  }

  if ($existing) {
    Set-NetFirewallRule `
      -Name $existing.Name `
      -Direction Inbound `
      -Action Allow `
      -Enabled True `
      -Profile $profiles | Out-Null

    # Ensure port/protocol match (in case an old rule was created wrong).
    $filters = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $existing
    $needsRecreate = $false
    foreach ($filter in @($filters)) {
      if ($filter.Protocol -ne "TCP" -or "$($filter.LocalPort)" -ne "$($rule.Port)") {
        $needsRecreate = $true
        break
      }
    }

    if ($needsRecreate) {
      Remove-NetFirewallRule -Name $existing.Name -ErrorAction SilentlyContinue
      New-NetFirewallRule `
        -Name $rule.Name `
        -DisplayName $rule.DisplayName `
        -Direction Inbound `
        -Action Allow `
        -Enabled True `
        -Protocol TCP `
        -LocalPort $rule.Port `
        -Profile $profiles | Out-Null
      Write-Host "Recreated: $($rule.DisplayName) on TCP $($rule.Port) [$($profiles -join ', ')]" -ForegroundColor Green
    } else {
      Write-Host "Updated/enabled: $($rule.DisplayName) on TCP $($rule.Port) [$($profiles -join ', ')]" -ForegroundColor Green
    }
    continue
  }

  New-NetFirewallRule `
    -Name $rule.Name `
    -DisplayName $rule.DisplayName `
    -Direction Inbound `
    -Action Allow `
    -Enabled True `
    -Protocol TCP `
    -LocalPort $rule.Port `
    -Profile $profiles | Out-Null

  Write-Host "Created: $($rule.DisplayName) on TCP $($rule.Port) [$($profiles -join ', ')]" -ForegroundColor Green
}

Write-Host ""
Write-Host "Verifying rules..." -ForegroundColor Cyan
$allOk = $true
foreach ($rule in $rules) {
  $found = Get-NetFirewallRule -Name $rule.Name -ErrorAction SilentlyContinue
  if (-not $found) {
    $found = Get-NetFirewallRule -DisplayName $rule.DisplayName -ErrorAction SilentlyContinue
  }

  if (-not $found) {
    Write-Host "MISSING: $($rule.DisplayName)" -ForegroundColor Red
    $allOk = $false
    continue
  }

  $port = Get-NetFirewallPortFilter -AssociatedNetFirewallRule $found | Select-Object -First 1
  Write-Host ("OK: {0} | Enabled={1} | Action={2} | Protocol={3} | Port={4} | Profile={5}" -f `
    $found.DisplayName, `
    $found.Enabled, `
    $found.Action, `
    $port.Protocol, `
    $port.LocalPort, `
    ($found.Profile -join ","))
}

Write-Host ""
Write-Host "Firewall rules ready. Start the app with: npm run dev" -ForegroundColor Green
Write-Host "On judge tablets, use your Wi-Fi LAN IP from npm run dev / ipconfig, e.g. http://192.168.0.109:3000"
Write-Host "Do not use Tailscale/VPN IPs unless the tablet is on the same VPN."
Write-Host ""

if (-not $allOk) {
  Write-Host "ERROR: One or more firewall rules could not be verified." -ForegroundColor Red
  exit 1
}
