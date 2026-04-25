$orgName = "Quick-Haul-Transit"
$githubToken = Read-Host "Enter your GitHub Personal Access Token (PAT) with repo/org access"

$headers = @{
    "Authorization" = "token $githubToken"
    "Accept" = "application/vnd.github.v3+json"
}

# Define the source directories and their corresponding repo names
$baseDesktop = "C:\Users\ASUS\OneDrive\Desktop"
$dockerizedTransport = "$baseDesktop\Dockerized Transport"
$k8sQuickHaul = "$baseDesktop\Kubernetes_Quick_Haul"

$repos = @(
    @{ Name = "quickhaul-frontend"; Path = "$dockerizedTransport\frontend" },
    @{ Name = "quickhaul-auth-service"; Path = "$dockerizedTransport\backend\services\auth_service" },
    @{ Name = "quickhaul-booking-service"; Path = "$dockerizedTransport\backend\services\booking_service" },
    @{ Name = "quickhaul-location-service"; Path = "$dockerizedTransport\backend\services\location_service" },
    @{ Name = "quickhaul-notification-service"; Path = "$dockerizedTransport\backend\services\notification_service" },
    @{ Name = "quickhaul-otp-service"; Path = "$dockerizedTransport\backend\services\otp_service" },
    @{ Name = "quickhaul-charts"; Path = "$k8sQuickHaul\helm-charts" },
    @{ Name = "quickhaul-infra"; Path = "$k8sQuickHaul" } # Used for haproxy and global scripts if needed
)

foreach ($repo in $repos) {
    $repoName = $repo.Name
    $repoPath = $repo.Path

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Processing $repoName..." -ForegroundColor Cyan
    
    # 1. Create Repository in GitHub Organization
    $body = @{
        name = $repoName
        private = $false
        description = "Quick Haul Transit - $repoName"
    } | ConvertTo-Json

    $createUrl = "https://api.github.com/orgs/$orgName/repos"
    try {
        $response = Invoke-RestMethod -Uri $createUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        Write-Host "Successfully created remote repo $orgName/$repoName on GitHub" -ForegroundColor Green
    } catch {
        Write-Host "Remote repo $orgName/$repoName might already exist or creation failed." -ForegroundColor Yellow
        # You can output `$_.Exception.Message` to see the actual error
    }

    # 2. Initialize local Git, commit and push
    if (Test-Path $repoPath) {
        Set-Location $repoPath
        
        # Initialize if not already a git repo
        if (-not (Test-Path ".git")) {
            git init
            git branch -M main
        }
        
        # Add remote
        $remoteUrl = "https://$githubToken@github.com/$orgName/$repoName.git"
        git remote remove origin 2>$null
        git remote add origin $remoteUrl
        
        # Commit and push
        git add .
        git commit -m "Initial commit for $repoName"
        git push -u origin main
        
        Write-Host "Successfully pushed $repoName to GitHub!" -ForegroundColor Green
    } else {
        Write-Host "Directory $repoPath does not exist. Skipping local init." -ForegroundColor Red
    }
}

Write-Host "`nAll done! Your repos should now be visible on https://github.com/$orgName" -ForegroundColor Cyan
