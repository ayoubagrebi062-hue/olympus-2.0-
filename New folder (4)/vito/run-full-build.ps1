$body = @{
    description = "Build TalentForge - Enterprise AI Recruitment Platform with dashboard (animated counters, hiring funnel chart with 14+ data points), candidate pipeline (drag-drop Kanban), job postings with CRUD, interview scheduler, analytics suite with export buttons, settings with dark mode toggle that persists. All buttons must have working onClick handlers. Delete must show confirmation modal and actually remove data. Charts must have 14+ real data points. Button spacing gap-2. Newsletter shows Demo Mode not fake success."
    tier = "starter"
} | ConvertTo-Json

Write-Host "Triggering build..."
Write-Host "This may take 2-5 minutes..."

try {
    $result = Invoke-RestMethod -Uri 'http://localhost:3001/api/debug/run-build' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 600
    Write-Host ""
    Write-Host "=== BUILD RESULT ==="
    $result | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_"
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host $reader.ReadToEnd()
}
