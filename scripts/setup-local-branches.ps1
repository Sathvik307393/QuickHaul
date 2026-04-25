# setup-local-branches.ps1
$baseDesktop = "C:\Users\ASUS\OneDrive\Desktop"
$dockerizedTransport = "$baseDesktop\Dockerized Transport"
$k8sQuickHaul = "$baseDesktop\Kubernetes_Quick_Haul"

$repos = @(
    "$dockerizedTransport\frontend",
    "$dockerizedTransport\backend\services\auth_service",
    "$dockerizedTransport\backend\services\booking_service",
    "$dockerizedTransport\backend\services\location_service",
    "$dockerizedTransport\backend\services\notification_service",
    "$dockerizedTransport\backend\services\otp_service",
    "$k8sQuickHaul\helm-charts",
    "$k8sQuickHaul"
)

foreach ($repoPath in $repos) {
    if (Test-Path "$repoPath\.git") {
        Set-Location $repoPath
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "Setting up branches for $repoPath..." -ForegroundColor Cyan
        
        # Ensure we're on main and it's up to date
        git checkout main 2>$null || git checkout -b main
        git pull origin main 2>$null
        
        # Create develop branch from main
        $branchExists = git branch --list develop
        if (-not $branchExists) {
            git checkout -b develop
            git push -u origin develop
            Write-Host "Created and pushed 'develop' branch" -ForegroundColor Green
        } else {
            Write-Host "'develop' branch already exists" -ForegroundColor Yellow
        }
    } else {
        Write-Host "`nSkipping $repoPath (Not a git repository)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Branch Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nRecommended branch protection rules in GitHub:" -ForegroundColor White
Write-Host "- Require pull request reviews before merging" -ForegroundColor Gray
Write-Host "- Require status checks to pass" -ForegroundColor Gray  
Write-Host "- Restrict pushes that create files larger than 100MB" -ForegroundColor Gray
Write-Host "- main branch: Only merge from develop or hotfix/*" -ForegroundColor Gray
