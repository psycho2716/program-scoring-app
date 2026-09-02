# Allow inbound TCP on ports 3000 (frontend) and 4000 (backend) for LAN judge tablets.
# Run in an elevated PowerShell: Right-click PowerShell -> Run as administrator
#   cd D:\Projects\hobby-projects\program-scoring-app
#   .\scripts\open-lan-firewall.ps1

$ErrorActionPreference = "Stop"

$rules = @(
  @{ DisplayName = "RSU Scoring Frontend (TCP 3000)"; Port = 3000 },
  @{ DisplayName = "RSU Scoring Backend (TCP 4000)"; Port = 4000 }
)

foreach ($rule in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $rule.DisplayName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Already exists: $($rule.DisplayName)"
    continue
  }

  New-NetFirewallRule `
    -DisplayName $rule.DisplayName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $rule.Port `
    -Profile Private, Domain | Out-Null

  Write-Host "Created: $($rule.DisplayName)"
}

Write-Host ""
Write-Host "Firewall rules ready. Start the app with: npm run dev"
Write-Host "On judge tablets, use your Wi-Fi LAN IP (ipconfig), e.g. http://10.0.0.39:3000"
Write-Host "Do not use Tailscale/VPN IPs unless the tablet is on the same VPN."
