# Create WAMP Apache virtual host pageant-system.local -> http://127.0.0.1:3000
# Must run elevated (Administrator).
#
#   npm run lan:vhost
#   .\scripts\setup-pageant-vhost.ps1
#
# This PC:            http://pageant-system.local
# Other Windows PCs:  run add-pageant-hosts.ps1 once (with this PC's Wi-Fi IP)
# Tablets:            http://<wifi-ip>:3000  (they cannot edit hosts without root)

$ErrorActionPreference = "Stop"
$HostName = "pageant-system.local"

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsAdministrator)) {
  Write-Host "Requesting Administrator permission (UAC)..." -ForegroundColor Yellow
  $argList = @(
    "-NoProfile"
    "-ExecutionPolicy", "Bypass"
    "-File", "`"$PSCommandPath`""
  )
  try {
    $p = Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $argList -Wait -PassThru
    exit $p.ExitCode
  } catch {
    $projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
    Write-Host ""
    Write-Host "ERROR: Administrator permission is required to edit Apache and the hosts file." -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as administrator, then:" -ForegroundColor Yellow
    Write-Host "  cd `"$projectRoot`"" -ForegroundColor Yellow
    Write-Host "  npm run lan:vhost" -ForegroundColor Yellow
    Write-Host ""
    exit 1
  }
}

$apacheSvc = Get-CimInstance Win32_Service -Filter "Name='wampapache64'" -ErrorAction SilentlyContinue
if (-not $apacheSvc) {
  throw "WAMP Apache service wampapache64 was not found. Is WAMP64 installed?"
}

# PathName looks like: "c:\wamp64\bin\apache\apache2.4.58\bin\httpd.exe" -k runservice
$httpdExe = ($apacheSvc.PathName -replace '^"', "" -split '"')[0]
if (-not (Test-Path $httpdExe)) {
  throw "Could not find httpd.exe from the WAMP Apache service path."
}

$apacheBin = Split-Path $httpdExe -Parent
$apacheRoot = Split-Path $apacheBin -Parent
$httpdConf = Join-Path $apacheRoot "conf\httpd.conf"
$vhostsConf = Join-Path $apacheRoot "conf\extra\httpd-vhosts.conf"

if (-not (Test-Path $httpdConf)) { throw "Missing $httpdConf" }
if (-not (Test-Path $vhostsConf)) { throw "Missing $vhostsConf" }

function Enable-LoadModule([string]$confPath, [string]$moduleFile) {
  $pattern = "(?m)^(\s*)#\s*(LoadModule\s+\S+\s+modules/$([regex]::Escape($moduleFile))\s*)$"
  $content = [IO.File]::ReadAllText($confPath)
  $updated = [regex]::Replace($content, $pattern, '$1$2')
  if ($updated -eq $content) {
    if ($content -notmatch "(?m)^\s*LoadModule\s+\S+\s+modules/$([regex]::Escape($moduleFile))") {
      throw "Could not enable Apache module $moduleFile in $confPath"
    }
    return $false
  }
  [IO.File]::WriteAllText($confPath, $updated)
  return $true
}

Copy-Item $httpdConf "$httpdConf.bak-pageant" -Force
Copy-Item $vhostsConf "$vhostsConf.bak-pageant" -Force

$enabled = @()
foreach ($mod in @("mod_proxy.so", "mod_proxy_http.so", "mod_proxy_wstunnel.so", "mod_headers.so")) {
  if (Enable-LoadModule $httpdConf $mod) { $enabled += $mod }
}
if ($enabled.Count -gt 0) {
  Write-Host "Enabled Apache modules: $($enabled -join ', ')" -ForegroundColor Green
} else {
  Write-Host "Apache proxy modules already enabled." -ForegroundColor Cyan
}

$begin = "# BEGIN RSU-PAGEANT-SYSTEM"
$end = "# END RSU-PAGEANT-SYSTEM"
$block = @"
$begin
<VirtualHost *:80>
  ServerName $HostName
  ServerAlias pageant-system
  ProxyRequests Off
  ProxyPreserveHost On
  RequestHeader set X-Forwarded-Proto "http"

  RewriteEngine On
  RewriteCond %{HTTP:Upgrade} =websocket [NC]
  RewriteRule /(.*) ws://127.0.0.1:3000/`$1 [P,L]

  <Proxy *>
    Require all granted
  </Proxy>

  ProxyPass / http://127.0.0.1:3000/
  ProxyPassReverse / http://127.0.0.1:3000/

  ErrorLog "`${SRVROOT}/logs/pageant-system-error.log"
  CustomLog "`${SRVROOT}/logs/pageant-system-access.log" common
</VirtualHost>
$end
"@

$vhosts = [IO.File]::ReadAllText($vhostsConf)
if ($vhosts -match [regex]::Escape($begin)) {
  $vhosts = [regex]::Replace(
    $vhosts,
    "(?s)" + [regex]::Escape($begin) + ".*?" + [regex]::Escape($end),
    $block.TrimEnd()
  )
  Write-Host "Updated existing $HostName virtual host." -ForegroundColor Green
} else {
  if (-not $vhosts.EndsWith("`n")) { $vhosts += "`r`n" }
  $vhosts += "`r`n" + $block.TrimEnd() + "`r`n"
  Write-Host "Added $HostName virtual host." -ForegroundColor Green
}
[IO.File]::WriteAllText($vhostsConf, $vhosts)

$hostsPath = Join-Path $env:SystemRoot "System32\drivers\etc\hosts"
$hostsText = [IO.File]::ReadAllText($hostsPath)
$hostsLine = "127.0.0.1 $HostName"
if ($hostsText -notmatch "(?m)^\s*127\.0\.0\.1\s+$([regex]::Escape($HostName))\s*$") {
  $nl = if ($hostsText.EndsWith("`n")) { "" } else { "`r`n" }
  [IO.File]::AppendAllText($hostsPath, "$nl$hostsLine`r`n")
  Write-Host "Added hosts entry: $hostsLine" -ForegroundColor Green
} else {
  Write-Host "Hosts entry already present: $hostsLine" -ForegroundColor Cyan
}

$profiles = @("Domain", "Private", "Public")
$ruleName = "RSU-Scoring-Apache-80"
$existing = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
  New-NetFirewallRule `
    -Name $ruleName `
    -DisplayName "RSU Scoring Apache (TCP 80)" `
    -Direction Inbound `
    -Action Allow `
    -Enabled True `
    -Protocol TCP `
    -LocalPort 80 `
    -Profile $profiles | Out-Null
  Write-Host "Opened firewall TCP 80 for LAN access." -ForegroundColor Green
}

Write-Host "Testing Apache config..." -ForegroundColor Cyan
& $httpdExe -t
if ($LASTEXITCODE -ne 0) {
  Write-Host "Apache config test failed. Restoring backups." -ForegroundColor Red
  Copy-Item "$httpdConf.bak-pageant" $httpdConf -Force
  Copy-Item "$vhostsConf.bak-pageant" $vhostsConf -Force
  exit 1
}

Restart-Service wampapache64 -ErrorAction Stop
Write-Host "Restarted WAMP Apache." -ForegroundColor Green

$lanIps = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" } |
  Select-Object -ExpandProperty IPAddress -Unique

Write-Host ""
Write-Host "Virtual host ready." -ForegroundColor Green
Write-Host "On this PC (with servers running):  http://$HostName"
Write-Host "Start servers:  npm run servers:start   or   npm run dev"
Write-Host ""
Write-Host "Other Windows devices on Wi-Fi - run as Administrator:" -ForegroundColor Yellow
if ($lanIps.Count -gt 0) {
  $exampleIp = @($lanIps)[0]
  Write-Host "  .\scripts\add-pageant-hosts.ps1 -ServerIp $exampleIp"
  Write-Host "Then open http://$HostName"
} else {
  Write-Host '  .\scripts\add-pageant-hosts.ps1 -ServerIp YOUR_WIFI_IPV4'
}
Write-Host ""
Write-Host 'Judge tablets (no hosts file): use http://WIFI_IP:3000' -ForegroundColor Yellow
Write-Host ""
