# PowerShell script to deploy balance API fix
Write-Host "🚀 Deploying balance API fix..."

# Configure git to not use pager
$env:GIT_PAGER = ""

# Add and commit changes
git add .
git commit -m "🏦 Fix balance API 404 errors - add missing routes to unified production integration"

# Push to remote
git push origin main

Write-Host "✅ Deploy complete! Check your deployment platform for updates."
