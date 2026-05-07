#Requires -Version 5.1
<#
.SYNOPSIS
  Botomatic Beta Local Launcher - fetches a fresh Auth0 token and starts the
  local dev UI pointed at the hosted Railway backend.

.NOTES
  Secrets live OUTSIDE the repo at:
    $HOME\Botomatic-local-secrets\beta-launch.env
  Never commit that file or its contents.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "Botomatic Beta Local Launcher" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Locate and load secrets file --------------------------------------

$secretsFile = Join-Path $HOME "Botomatic-local-secrets\beta-launch.env"
if (!(Test-Path $secretsFile)) {
    Write-Host "ERROR: Secrets file not found: $secretsFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create it with at minimum:" -ForegroundColor Yellow
    Write-Host "  AUTH0_DOMAIN=<your-auth0-domain>" -ForegroundColor Yellow
    Write-Host "  AUTH0_SMOKE_CLIENT_ID=<client-id>" -ForegroundColor Yellow
    Write-Host "  AUTH0_SMOKE_CLIENT_SECRET=<client-secret>" -ForegroundColor Yellow
    Write-Host "  AUTH0_AUDIENCE=<audience>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "See docs/beta/LOCAL_BETA_LAUNCH.md for the full format." -ForegroundColor Yellow
    exit 1
}

$secrets = @{}
foreach ($rawLine in Get-Content $secretsFile) {
    $trimmed = $rawLine.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) { continue }
    $eqIdx = $trimmed.IndexOf("=")
    if ($eqIdx -gt 0) {
        $k = $trimmed.Substring(0, $eqIdx).Trim()
        $v = $trimmed.Substring($eqIdx + 1).Trim()
        $secrets[$k] = $v
    }
}

# --- 2. Reject placeholder / unfilled values ------------------------------

$PLACEHOLDER_PATTERNS = @("YOUR_", "PASTE_", "REPLACE_", "changeme", "placeholder")
$REQUIRED_KEYS = @("AUTH0_DOMAIN", "AUTH0_SMOKE_CLIENT_ID", "AUTH0_SMOKE_CLIENT_SECRET", "AUTH0_AUDIENCE")

foreach ($key in $REQUIRED_KEYS) {
    if (!$secrets.ContainsKey($key) -or $secrets[$key] -eq "") {
        Write-Host "ERROR: Required secret is missing or empty: $key" -ForegroundColor Red
        exit 1
    }
    foreach ($pat in $PLACEHOLDER_PATTERNS) {
        if ($secrets[$key] -like "*$pat*") {
            Write-Host "ERROR: $key still contains a placeholder value ('$pat'). Update $secretsFile." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "Secrets loaded and validated." -ForegroundColor Green

# --- 3. Request Auth0 client_credentials token ----------------------------

Write-Host "Requesting Auth0 access token..." -ForegroundColor Yellow

$tokenUri  = "https://$($secrets['AUTH0_DOMAIN'])/oauth/token"
$tokenBody = @{
    client_id     = $secrets['AUTH0_SMOKE_CLIENT_ID']
    client_secret = $secrets['AUTH0_SMOKE_CLIENT_SECRET']
    audience      = $secrets['AUTH0_AUDIENCE']
    grant_type    = "client_credentials"
} | ConvertTo-Json -Compress

try {
    $tokenResponse = Invoke-RestMethod `
        -Uri         $tokenUri `
        -Method      POST `
        -ContentType "application/json" `
        -Body        $tokenBody
} catch {
    Write-Host "ERROR: Auth0 token request failed." -ForegroundColor Red
    Write-Host "  URI  : $tokenUri" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

$accessToken = $tokenResponse.access_token

# --- 4. Validate JWT format -----------------------------------------------

if (!$accessToken -or !$accessToken.StartsWith("eyJ")) {
    Write-Host "ERROR: Access token does not start with 'eyJ' -- not a valid JWT." -ForegroundColor Red
    Write-Host "  Check AUTH0_DOMAIN, AUTH0_SMOKE_CLIENT_ID, AUTH0_SMOKE_CLIENT_SECRET, AUTH0_AUDIENCE." -ForegroundColor Red
    exit 1
}

Write-Host "Token acquired (eyJ...)." -ForegroundColor Green

# --- 5. Set environment variables -----------------------------------------

function Get-SecretOrDefault {
    param([string]$Key, [string]$Default)
    if ($secrets.ContainsKey($Key) -and $secrets[$Key] -ne "") { return $secrets[$Key] }
    return $Default
}

$defaultRailwayUrl = "https://botomatic-etmt-production.up.railway.app"

$env:BOTOMATIC_BETA_AUTH_TOKEN  = $accessToken
$env:BOTOMATIC_BETA_USER_ID     = Get-SecretOrDefault "BOTOMATIC_BETA_USER_ID"    "beta-smoke-admin"
$env:BOTOMATIC_BETA_TENANT_ID   = Get-SecretOrDefault "BOTOMATIC_BETA_TENANT_ID"  "beta-smoke-tenant"
$env:NEXT_PUBLIC_API_BASE_URL   = Get-SecretOrDefault "NEXT_PUBLIC_API_BASE_URL"  $defaultRailwayUrl
$env:BOTOMATIC_API_BASE_URL     = Get-SecretOrDefault "BOTOMATIC_API_BASE_URL"    $defaultRailwayUrl
$env:API_BASE_URL               = Get-SecretOrDefault "API_BASE_URL"              $defaultRailwayUrl

Write-Host "Environment configured:" -ForegroundColor Green
Write-Host "  BOTOMATIC_BETA_USER_ID   = $($env:BOTOMATIC_BETA_USER_ID)" -ForegroundColor DarkGray
Write-Host "  BOTOMATIC_BETA_TENANT_ID = $($env:BOTOMATIC_BETA_TENANT_ID)" -ForegroundColor DarkGray
Write-Host "  NEXT_PUBLIC_API_BASE_URL = $($env:NEXT_PUBLIC_API_BASE_URL)" -ForegroundColor DarkGray

# --- 6. Kill old dev-server processes on ports 3000, 3001, 4000 ----------

Write-Host "Clearing ports 3000, 3001, 4000..." -ForegroundColor Yellow
@(3000, 3001, 4000) | ForEach-Object {
    $port = $_
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
Write-Host "Ports cleared." -ForegroundColor Green

# --- 7. Clear Next.js build cache -----------------------------------------

$repoRoot  = Split-Path -Parent $PSScriptRoot
$nextCache = Join-Path $repoRoot "apps\control-plane\.next"
if (Test-Path $nextCache) {
    Write-Host "Clearing Next.js cache ($nextCache)..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $nextCache
    Write-Host "Cache cleared." -ForegroundColor Green
}

# --- 8. Health-check the hosted Railway API --------------------------------

$betaBaseUrl = Get-SecretOrDefault "BOTOMATIC_BETA_BASE_URL" $defaultRailwayUrl

Write-Host "Checking hosted API at $betaBaseUrl ..." -ForegroundColor Yellow
foreach ($ep in @("health", "ready")) {
    try {
        $null = Invoke-RestMethod -Uri "$betaBaseUrl/api/$ep" -TimeoutSec 10 -ErrorAction Stop
        Write-Host "  /api/$ep : OK" -ForegroundColor Green
    } catch {
        Write-Host "  /api/$ep : WARN -- $_ (will proceed)" -ForegroundColor Yellow
    }
}

# --- 9. Start local UI dev server and open browser -----------------------

Write-Host ""
Write-Host "Starting local UI dev server..." -ForegroundColor Cyan
Write-Host "Browser will open at http://localhost:3000 once ready." -ForegroundColor Cyan
Write-Host ""

Start-Job -ScriptBlock {
    Start-Sleep -Seconds 10
    Start-Process "http://localhost:3000"
} | Out-Null

Set-Location $repoRoot
npm run ui:dev
