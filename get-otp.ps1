# Prints the most recent phone OTP from the deployed MosqueConnect API.
#
# The deployed API logs OTP codes instead of sending SMS (OTP_SMS_DRIVER=log,
# APP_ENV=local). Codes expire 5 minutes after they are issued, so request the
# code in the browser first, then run this.
#
# Usage:  .\get-otp.ps1

# Azure CLI installs to a fixed location, but a terminal opened before the
# install still has the old PATH, so resolve az explicitly rather than assuming
# the caller's session can see it.
$az = (Get-Command az -ErrorAction SilentlyContinue).Source
if (-not $az) {
    $fallback = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
    if (Test-Path $fallback) { $az = $fallback }
}
if (-not $az) {
    Write-Host "Azure CLI (az) was not found." -ForegroundColor Red
    Write-Host "Install it with:  winget install --exact --id Microsoft.AzureCLI"
    exit 1
}

$logs = & $az containerapp logs show --name mc-api --resource-group mosqueconnect-rg --tail 200 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Could not read logs from Azure." -ForegroundColor Red
    Write-Host "If you are not signed in, run:  az login"
    exit 1
}

$found = [regex]::Matches(($logs -join "`n"), '\\"phone\\":\\"(\+\d+)\\",\\"otp\\":\\"(\d+)\\"')
if ($found.Count -eq 0) {
    Write-Host "No OTP found in the last 200 log lines." -ForegroundColor Yellow
    Write-Host "Request a code on the site first, then run this again."
    exit 1
}

$last = $found[$found.Count - 1]
Write-Host ""
Write-Host ("  Phone : " + $last.Groups[1].Value)
Write-Host ("  OTP   : " + $last.Groups[2].Value) -ForegroundColor Green
Write-Host ""
Write-Host "Expires 5 minutes after it was issued."
