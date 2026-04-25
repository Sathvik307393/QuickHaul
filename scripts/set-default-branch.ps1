# set-default-branch.ps1
$orgName = "Quick-Haul-Transit"
$githubToken = Read-Host "Enter your GitHub Personal Access Token (PAT)"

$headers = @{
    "Authorization" = "token $githubToken"
    "Accept" = "application/vnd.github.v3+json"
}

# Define the repos to update
$repos = @(
    "quickhaul-frontend",
    "quickhaul-auth-service",
    "quickhaul-booking-service",
    "quickhaul-location-service",
    "quickhaul-notification-service",
    "quickhaul-otp-service",
    "quickhaul-charts",
    "quickhaul-infra",
    "auth-service" # Added this one as well just in case
)

foreach ($repoName in $repos) {
    Write-Host "`nSetting default branch to 'main' for $repoName..." -ForegroundColor Cyan
    $url = "https://api.github.com/repos/$orgName/$repoName"
    
    $body = @{
        default_branch = "main"
    } | ConvertTo-Json

    try {
        $response = Invoke-RestMethod -Uri $url -Method Patch -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "Successfully set 'main' as default for $repoName" -ForegroundColor Green
    } catch {
        Write-Host "Failed to update $repoName. It might not exist or 'main' branch might not be pushed yet." -ForegroundColor Yellow
        # Write-Host $_.Exception.Message
    }
}

Write-Host "`nAll done!" -ForegroundColor Cyan
