# Remove stored GitHub credentials so you can sign in as rukminivardhan25
# Run in PowerShell: .\clear-git-credentials.ps1

"protocol=https`nhost=github.com" | git credential reject
Write-Host "Done. Now run: git push -u origin main"
Write-Host "Use username: rukminivardhan25 and a Personal Access Token as password."
