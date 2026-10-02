# Prints the most recent phone OTP from the local Laravel log.
#
# The API does not send real SMS in development (OTP_SMS_DRIVER=log). It writes
# each code to apps/api/storage/logs/laravel.log instead. Codes expire 5 minutes
# after they are issued, so request the code in the browser first, then run this.
#
# Usage:  .\get-otp.ps1                       # latest code for any phone
#         .\get-otp.ps1 -Phone +8801712345678 # latest code for one phone

param(
    [string]$Phone
)

$log = Join-Path $PSScriptRoot "apps\api\storage\logs\laravel.log"
if (-not (Test-Path $log)) {
    Write-Host "No log file at $log" -ForegroundColor Red
    Write-Host "Start the API and request a code on the site first."
    exit 1
}

# Matches: [2026-10-02 01:06:00] local.INFO: Local phone OTP generated. {"phone":"+880...","otp":"123456"}
$pattern = '^\[(?<time>[\d\- :]+)\][^\n]*Local phone OTP generated\.\s*\{"phone":"(?<phone>\+\d+)","otp":"(?<otp>\d+)"'
$found = Select-String -Path $log -Pattern $pattern |
    ForEach-Object { $_.Matches[0] } |
    Where-Object { -not $Phone -or $_.Groups['phone'].Value -eq $Phone }

if (-not $found) {
    $target = if ($Phone) { " for $Phone" } else { "" }
    Write-Host "No OTP found$target in laravel.log." -ForegroundColor Yellow
    Write-Host "Request a code on the site first, then run this again."
    exit 1
}

$last = @($found)[-1]

# Laravel logs in the app timezone, which is UTC.
$issued = [DateTime]::ParseExact($last.Groups['time'].Value, 'yyyy-MM-dd HH:mm:ss', $null)
$remaining = $issued.AddMinutes(5) - [DateTime]::UtcNow

Write-Host ""
Write-Host ("  Phone : " + $last.Groups['phone'].Value)
Write-Host ("  OTP   : " + $last.Groups['otp'].Value) -ForegroundColor Green
Write-Host ""
if ($remaining.TotalSeconds -gt 0) {
    Write-Host ("Expires in {0}m {1:D2}s." -f [int][Math]::Floor($remaining.TotalMinutes), $remaining.Seconds)
} else {
    Write-Host "This code has expired. Request a new one on the site." -ForegroundColor Yellow
}
