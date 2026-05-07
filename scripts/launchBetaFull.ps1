#Requires -Version 5.1
<#
.SYNOPSIS
  Botomatic Beta Full Launcher - full preflight checks + hosted build flow.

.DESCRIPTION
  Loads secrets from $HOME\Botomatic-local-secrets\beta-launch.env,
  fetches a fresh Auth0 OIDC token, verifies the Railway backend is healthy
  and accessible, then starts the local control-plane UI.

  Local machine does NOT need OpenAI / Anthropic / Gemini / GitHub / Supabase
  secrets -- those live in Railway's environment. Only Auth0 smoke-client
  credentials are required locally.

.PARAMETER CheckOnly
  Run all preflight checks and print GO / NO-GO without starting the UI.
  Exits 0 if all checks pass, 1 if any fail.

.NOTES
  Secrets file lives OUTSIDE the repo -- never commit it:
    $HOME\Botomatic-local-secrets\beta-launch.env
#>
param(
    [switch]$CheckOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$checks   = @()
$failures = @()
$goNoGo   = @()

Write-Host ""
if ($CheckOnly) {
    Write-Host "Botomatic Beta - Preflight Check (check only mode)" -ForegroundColor Cyan
} else {
    Write-Host "Botomatic Beta Full Launcher" -ForegroundColor Cyan
}
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

function Add-Check {
    param([string]$Label, [bool]$Ok, [string]$Detail = "")
    $script:goNoGo += [pscustomobject]@{ Label = $Label; Ok = $Ok; Detail = $Detail }
    $color = if ($Ok) { "Green" } else { "Red" }
    $mark  = if ($Ok) { "PASS" } else { "FAIL" }
    $line  = "  [$mark] $Label"
    if ($Detail) { $line += " - $Detail" }
    Write-Host $line -ForegroundColor $color
}

# --- 1. Load secrets file -------------------------------------------------

$secretsFile = Join-Path $HOME "Botomatic-local-secrets\beta-launch.env"
if (!(Test-Path $secretsFile)) {
    Write-Host "ERROR: Secrets file not found: $secretsFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Create it -- see docs/beta/LOCAL_BETA_LAUNCH.md for the full format." -ForegroundColor Yellow
    Write-Host "Required keys: AUTH0_DOMAIN, AUTH0_SMOKE_CLIENT_ID, AUTH0_SMOKE_CLIENT_SECRET, AUTH0_AUDIENCE, BOTOMATIC_BETA_BASE_URL" -ForegroundColor Yellow
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

Write-Host "Secrets file: $secretsFile" -ForegroundColor DarkGray

# --- 2. Reject placeholder / unfilled values ------------------------------

$PLACEHOLDER_PATTERNS = @("YOUR_", "PASTE_", "REPLACE_", "changeme", "placeholder")
$REQUIRED_KEYS = @("AUTH0_DOMAIN", "AUTH0_SMOKE_CLIENT_ID", "AUTH0_SMOKE_CLIENT_SECRET", "AUTH0_AUDIENCE", "BOTOMATIC_BETA_BASE_URL")

$secretsOk = $true
foreach ($key in $REQUIRED_KEYS) {
    if (!$secrets.ContainsKey($key) -or $secrets[$key] -eq "") {
        Write-Host "ERROR: Required secret is missing or empty: $key" -ForegroundColor Red
        $secretsOk = $false
        continue
    }
    foreach ($pat in $PLACEHOLDER_PATTERNS) {
        if ($secrets[$key] -like "*$pat*") {
            Write-Host "ERROR: $key still contains a placeholder value ('$pat'). Update $secretsFile." -ForegroundColor Red
            $secretsOk = $false
        }
    }
}

if (!$secretsOk) { exit 1 }
Write-Host "Secrets validated -- no placeholders found." -ForegroundColor Green
Write-Host ""
Write-Host "Running preflight checks..." -ForegroundColor Yellow
Write-Host ""

# --- 3. Request Auth0 client_credentials token ----------------------------

$tokenOk     = $false
$accessToken = $null

try {
    $tokenUri  = "https://$($secrets['AUTH0_DOMAIN'])/oauth/token"
    $tokenBody = @{
        client_id     = $secrets['AUTH0_SMOKE_CLIENT_ID']
        client_secret = $secrets['AUTH0_SMOKE_CLIENT_SECRET']
        audience      = $secrets['AUTH0_AUDIENCE']
        grant_type    = "client_credentials"
    } | ConvertTo-Json -Compress

    $tokenResponse = Invoke-RestMethod `
        -Uri         $tokenUri `
        -Method      POST `
        -ContentType "application/json" `
        -Body        $tokenBody

    $accessToken = $tokenResponse.access_token

    # Validate JWT format - token must start with eyJ (base64url-encoded "{")
    if ($accessToken -and $accessToken.StartsWith("eyJ")) {
        $tokenOk = $true
        Add-Check "Auth0 token (eyJ...)" $true "client_credentials OK"
    } else {
        Add-Check "Auth0 token (eyJ...)" $false "Token does not start with eyJ"
    }
} catch {
    Add-Check "Auth0 token (eyJ...)" $false "Request failed: $_"
}

if (!$tokenOk) {
    Write-Host ""
    Write-Host "NO-GO: Cannot obtain valid OIDC token. Check AUTH0_* secrets." -ForegroundColor Red
    exit 1
}

# --- 4. Set environment variables -----------------------------------------

function Get-SecretOrDefault {
    param([string]$Key, [string]$Default)
    if ($secrets.ContainsKey($Key) -and $secrets[$Key] -ne "") { return $secrets[$Key] }
    return $Default
}

$betaBaseUrl = $secrets['BOTOMATIC_BETA_BASE_URL']
$defaultUrl  = $betaBaseUrl

$env:BOTOMATIC_BETA_AUTH_TOKEN  = $accessToken
$env:BOTOMATIC_BETA_USER_ID     = Get-SecretOrDefault "BOTOMATIC_BETA_USER_ID"   "beta-smoke-admin"
$env:BOTOMATIC_BETA_TENANT_ID   = Get-SecretOrDefault "BOTOMATIC_BETA_TENANT_ID" "beta-smoke-tenant"
$env:BOTOMATIC_BETA_BASE_URL    = $betaBaseUrl
$env:NEXT_PUBLIC_API_BASE_URL   = Get-SecretOrDefault "NEXT_PUBLIC_API_BASE_URL"  $defaultUrl
$env:BOTOMATIC_API_BASE_URL     = Get-SecretOrDefault "BOTOMATIC_API_BASE_URL"    $defaultUrl
$env:API_BASE_URL               = Get-SecretOrDefault "API_BASE_URL"              $defaultUrl

Add-Check "Environment variables set" $true "$($env:BOTOMATIC_BETA_USER_ID) @ $($env:NEXT_PUBLIC_API_BASE_URL)"

# --- 5. Health checks -----------------------------------------------------

foreach ($ep in @("health", "ready")) {
    try {
        $null = Invoke-RestMethod -Uri "$betaBaseUrl/api/$ep" -TimeoutSec 10 -ErrorAction Stop
        Add-Check "/api/$ep" $true "OK"
    } catch {
        Add-Check "/api/$ep" $false "$_"
    }
}

# --- 6. Protected route check: /api/ops/metrics ---------------------------

try {
    $metricsHeaders = @{
        "Authorization" = "Bearer $accessToken"
        "x-role"        = "admin"
        "x-user-id"     = $env:BOTOMATIC_BETA_USER_ID
        "x-tenant-id"   = $env:BOTOMATIC_BETA_TENANT_ID
    }
    $null = Invoke-RestMethod `
        -Uri     "$betaBaseUrl/api/ops/metrics" `
        -Headers $metricsHeaders `
        -TimeoutSec 10 `
        -ErrorAction Stop
    Add-Check "/api/ops/metrics (auth)" $true "Protected route accessible"
} catch {
    $statusCode = $null
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
    }
    if ($statusCode -eq 401 -or $statusCode -eq 403) {
        Add-Check "/api/ops/metrics (auth)" $false "Auth rejected ($statusCode) - token or role mismatch"
    } elseif ($statusCode -eq 404) {
        Add-Check "/api/ops/metrics (auth)" $true "/ops/metrics not found on this deployment (non-fatal)"
    } else {
        Add-Check "/api/ops/metrics (auth)" $false "$_"
    }
}

# --- 7. Project status check (optional) -----------------------------------

$projectId = Get-SecretOrDefault "BOTOMATIC_BETA_PROJECT_ID" ""
if ($projectId -ne "") {
    try {
        $projHeaders = @{
            "Authorization" = "Bearer $accessToken"
            "x-role"        = "admin"
            "x-user-id"     = $env:BOTOMATIC_BETA_USER_ID
            "x-tenant-id"   = $env:BOTOMATIC_BETA_TENANT_ID
        }
        $projStatus = Invoke-RestMethod `
            -Uri     "$betaBaseUrl/api/projects/$projectId/runtime" `
            -Headers $projHeaders `
            -TimeoutSec 10 `
            -ErrorAction Stop
        $statusVal = if ($projStatus.status) { $projStatus.status } else { "ok" }
        Add-Check "/api/projects/$projectId/runtime" $true "status=$statusVal"
    } catch {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq 404) {
            Add-Check "/api/projects/$projectId/runtime" $true "Project not found on Railway (may be local-only)"
        } else {
            Add-Check "/api/projects/$projectId/runtime" $false "$_"
        }
    }
} else {
    Write-Host "  [SKIP] Project status check - BOTOMATIC_BETA_PROJECT_ID not set" -ForegroundColor DarkGray
}

# --- 8. GO / NO-GO summary ------------------------------------------------

Write-Host ""
Write-Host "-------------------------------------------------" -ForegroundColor DarkGray

$failures = $goNoGo | Where-Object { !$_.Ok }
if ($failures.Count -eq 0) {
    Write-Host "  GO -- all preflight checks passed." -ForegroundColor Green
} else {
    Write-Host "  NO-GO -- $($failures.Count) check(s) failed:" -ForegroundColor Red
    foreach ($f in $failures) {
        Write-Host "    * $($f.Label): $($f.Detail)" -ForegroundColor Red
    }
}
Write-Host "-------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

if ($CheckOnly) {
    exit $(if ($failures.Count -eq 0) { 0 } else { 1 })
}

if ($failures.Count -gt 0) {
    Write-Host "Aborting launch due to preflight failures above." -ForegroundColor Red
    exit 1
}

# --- 9. Kill old dev-server processes on ports 3000, 3001, 4000 ----------

Write-Host "Clearing ports 3000, 3001, 4000..." -ForegroundColor Yellow
@(3000, 3001, 4000) | ForEach-Object {
    $port = $_
    Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique |
        ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}

# --- 10. Clear Next.js build cache ----------------------------------------

$repoRoot  = Split-Path -Parent $PSScriptRoot
$nextCache = Join-Path $repoRoot "apps\control-plane\.next"
if (Test-Path $nextCache) {
    Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $nextCache
}

# --- 11. Start local UI dev server + open browser -------------------------

Write-Host "Starting local UI dev server..." -ForegroundColor Cyan
Write-Host "Browser will open at http://localhost:3000 once ready." -ForegroundColor Cyan
Write-Host ""
Write-Host "Architecture:" -ForegroundColor DarkGray
Write-Host "  Browser -> localhost:3000 (Next.js, local)" -ForegroundColor DarkGray
Write-Host "  Next.js proxy -> $betaBaseUrl (Railway, hosted)" -ForegroundColor DarkGray
Write-Host "  Provider secrets (OpenAI/Anthropic/etc.) stay in Railway." -ForegroundColor DarkGray
Write-Host ""

Start-Job -ScriptBlock {
    Start-Sleep -Seconds 10
    Start-Process "http://localhost:3000"
} | Out-Null

Set-Location $repoRoot
npm run ui:dev
